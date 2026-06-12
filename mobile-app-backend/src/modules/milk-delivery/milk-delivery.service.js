'use strict';

const milkDeliveryRepo = require('./milk-delivery.repository');
const customerRepo     = require('../../repositories/customer.repository');
const billingRepo      = require('../../repositories/billing.repository');
const {
  getEffectiveDateRange,
  calculateCustomerBilling,
  buildConfigRanges,
  toDateStr,
  sumBills,
  deriveOpeningBalance,
  utcToday,
  getOpeningBalanceForMonth,
} = require('../../services/billing.calculator');

// ─── Monthly Bandi List ───────────────────────────────────────────────────────

/**
 * Get the full monthly delivery calendar for a customer.
 *
 * Three-layer rule:
 *   Layer 1 — getEffectiveDateRange() enforces registrationDate boundary
 *   Layer 2 — calculateCustomerBilling() applies correct config per date
 *   Layer 3 — calculateCustomerBilling() applies MilkDelivery overrides
 *
 * Performance: 3 bulk DB queries, all processing in memory.
 * Daily list NEVER contains dates before registrationDate.
 *
 * @param {string} customerId
 * @param {number} queryMonth  (1–12)
 * @param {number} queryYear
 * @param {string} vendorId    Authorization check
 * @returns {Object} Monthly calendar with daily breakdown + billing summary
 */
const getMonthlyBadiList = async (customerId, queryMonth, queryYear, vendorId) => {
  // 1. Validate customer & ownership
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  if (customer.vendorId !== vendorId) {
    const err = new Error('Unauthorized: customer does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  // 2. Layer 1 — get effective date range respecting registrationDate
  const range = getEffectiveDateRange(customer.registrationDate, queryMonth, queryYear);

  // Customer not registered yet in this period → return empty
  if (!range) {
    return _buildEmptyResponse(customer, queryMonth, queryYear);
  }

  const { startDate, endDate } = range;

  const regDate = new Date(customer.registrationDate);
  const lastDayOfMonth = new Date(Date.UTC(queryYear, queryMonth, 0));
  const today = utcToday();
  const globalEnd = today > lastDayOfMonth ? today : lastDayOfMonth;

  const [configs, deliveries, payments, extraProducts] = await Promise.all([
    billingRepo.getConfigsForCustomers([customerId], globalEnd),
    billingRepo.getDeliveriesForCustomers([customerId], regDate, globalEnd),
    billingRepo.getPaymentsForCustomersFromDate([customerId], regDate),
    billingRepo.getExtraProductsForCustomers([customerId], regDate, globalEnd),
  ]);

  // Derive dynamic opening balance
  const derivedOpening = getOpeningBalanceForMonth(
    customer,
    queryMonth,
    queryYear,
    configs,
    deliveries,
    payments,
    extraProducts
  );

  const derivedCustomer = {
    ...customer,
    remainingAmount: derivedOpening.remainingAmount,
    advanceAmount:   derivedOpening.advanceAmount,
  };

  // Filter to requested month
  const monthDeliveries = deliveries.filter(d => new Date(d.date) <= lastDayOfMonth);
  const monthExtraProducts = extraProducts.filter(ep => new Date(ep.date) <= lastDayOfMonth);
  const monthPayments = payments.filter(p => p.month === queryMonth && p.year === queryYear);

  // 4. Delegate to shared billing engine (Layers 2 + 3)
  const calc = calculateCustomerBilling({
    customer:      derivedCustomer,
    startDate,
    endDate,
    configs,
    deliveries:    monthDeliveries,
    payments:      monthPayments,
    extraProducts: monthExtraProducts,
  });

  // 5. Build current active config for display
  const sortedConfigs = [...configs].sort(
    (a, b) => toDateStr(a.effectiveFrom).localeCompare(toDateStr(b.effectiveFrom))
  );
  const latestConfig = sortedConfigs[sortedConfigs.length - 1] || null;

  return {
    customer: {
      customerId:       customer.id,
      name:             customer.name,
      registrationDate: toDateStr(customer.registrationDate),
      currentConfig:    latestConfig ? {
        morningQuantity: parseFloat(latestConfig.morningQuantity.toString()),
        eveningQuantity: parseFloat(latestConfig.eveningQuantity.toString()),
        ratePerLiter:    parseFloat(latestConfig.ratePerLiter.toString()),
        effectiveFrom:   toDateStr(latestConfig.effectiveFrom),
      } : null,
    },
    month:     queryMonth,
    year:      queryYear,
    dateRange: calc.dateRange,
    summary: {
      totalDaysMilkTaken:  calc.totalDaysMilkTaken,
      totalMorningMilk:    calc.totalMorningMilk,
      totalEveningMilk:    calc.totalEveningMilk,
      totalMilkDelivered:  calc.totalMilkDelivered,
      baseAmount:          calc.baseAmount,
      extraProductAmount:  calc.extraProductAmount,
      openingDue:          calc.openingDue,
      advanceAmount:       calc.advanceAmount,
      totalAmount:         calc.totalAmount,
      totalPaid:           calc.paymentPaid,
      remainingAmount:     calc.remainingPayment,
      paymentStatus:       calc.paymentStatus,
    },
    // dailyList is NEVER populated with dates before registrationDate
    dailyList: calc.dailyList,
    extraProducts: calc.extraProducts || [],
  };
};

// ─── Update / Override Daily Entry ───────────────────────────────────────────

/**
 * Upsert a MilkDelivery override for a specific date.
 *
 * Validation:
 *  - Date must not be before registrationDate (Layer 1)
 *  - Customer must belong to the calling vendor
 *
 * @param {Object} payload - { customerId, date, morningQuantity, eveningQuantity }
 * @param {string} vendorId
 */
const updateDailyEntry = async (payload, vendorId) => {
  const customer = await customerRepo.findCustomerById(payload.customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  if (customer.vendorId !== vendorId) {
    const err = new Error('Unauthorized: customer does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  // Layer 1 guard: disallow overrides before registration date
  const registrationDateStr = toDateStr(customer.registrationDate);
  if (payload.date < registrationDateStr) {
    const err = new Error(`Cannot record delivery before registration date (${registrationDateStr})`);
    err.statusCode = 400;
    throw err;
  }

  const dateObj = new Date(`${payload.date}T00:00:00.000Z`);

  await milkDeliveryRepo.upsertDailyEntry({
    customerId:      payload.customerId,
    vendorId,
    date:            dateObj,
    morningQuantity: payload.morningQuantity,
    eveningQuantity: payload.eveningQuantity,
    updatedBy:       vendorId,
    createdBy:       vendorId,
  });

  return { success: true, message: 'Daily entry updated successfully.' };
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

const _buildEmptyResponse = (customer, month, year) => ({
  customer: {
    customerId:       customer.id,
    name:             customer.name,
    registrationDate: toDateStr(customer.registrationDate),
    currentConfig:    null,
  },
  month,
  year,
  dateRange:  { startDate: null, endDate: null },
  summary: {
    totalDaysMilkTaken:  0,
    totalMorningMilk:    0,
    totalEveningMilk:    0,
    totalMilkDelivered:  0,
    baseAmount:          0,
    extraProductAmount:  0,
    openingDue:          parseFloat((customer.remainingAmount || 0).toString()),
    advanceAmount:       parseFloat((customer.advanceAmount || 0).toString()),
    totalAmount:         parseFloat(((customer.remainingAmount || 0) - (customer.advanceAmount || 0)).toString()),
    totalPaid:           0,
    remainingAmount:     parseFloat(Math.max(0, (customer.remainingAmount || 0) - (customer.advanceAmount || 0)).toString()),
    paymentStatus:       'UNPAID',
  },
  dailyList: [],
  extraProducts: [],
});

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { getMonthlyBadiList, updateDailyEntry };
