'use strict';

const prisma      = require('../../config/prisma');
const billingRepo = require('../../repositories/billing.repository');
const {
  getEffectiveDateRange,
  calculateCustomerBilling,
  calculateDailyMilk,
  buildConfigRanges,
  toDateStr,
  utcToday,
} = require('../../services/billing.calculator');

// ─── Vendor Dashboard ─────────────────────────────────────────────────────────

/**
 * Compute vendor dashboard data.
 *
 * Three-layer rule applied to both summaries:
 *   Layer 1 — Date Boundary : registrationDate (customers not yet started are skipped)
 *   Layer 2 — Config        : effectiveFrom ranges applied per date
 *   Layer 3 — Override      : MilkDelivery daily overrides applied per date
 *
 * "Today Summary"   → milk delivered on a specific date (default: today)
 * "Monthly Summary" → aggregated billing for the target month
 *
 * Query strategy (zero N+1):
 *   1. One query → all active customers for vendor
 *   2. One query → all CustomerMilkConfig rows (effectiveFrom ≤ last day of month)
 *   3. One query → all MilkDelivery rows in month
 *   4. One query → all Payment rows in month
 *   5. In-memory → all grouping + computation
 *
 * @param {Object} params
 * @param {string}  params.vendorId
 * @param {string}  [params.reqDate]   - 'YYYY-MM-DD' override for today summary
 * @param {number}  [params.reqMonth]  - 1–12, defaults to current month
 * @param {number}  [params.reqYear]   - defaults to current year
 * @returns {Object} { todaySummary, monthlySummary }
 */
const getVendorDashboardData = async ({ vendorId, reqDate, reqMonth, reqYear }) => {
  const today = utcToday();

  const targetDateStr = reqDate   || toDateStr(today);
  const targetMonth   = reqMonth  ? parseInt(reqMonth, 10) : today.getUTCMonth() + 1;
  const targetYear    = reqYear   ? parseInt(reqYear,  10) : today.getUTCFullYear();

  // ── 1. Active customers for this vendor ──────────────────────────────────────
  const customers = await prisma.customer.findMany({
    where: { vendorId, isActive: true },
  });

  if (customers.length === 0) {
    return _buildEmptyDashboard(targetDateStr, targetMonth, targetYear);
  }

  const customerIds    = customers.map((c) => c.id);
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0));
  // globalEnd: used for bulk delivery fetch (widest range for the month)
  const globalStart    = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const globalEnd      = today < lastDayOfMonth ? today : lastDayOfMonth;

  // ── 2. Bulk fetch (3 queries) ────────────────────────────────────────────────
  const [configs, deliveries, payments] = await Promise.all([
    billingRepo.getConfigsForCustomers(customerIds, lastDayOfMonth),
    billingRepo.getDeliveriesForCustomers(customerIds, globalStart, globalEnd),
    billingRepo.getPaymentsForCustomers(customerIds, targetMonth, targetYear),
  ]);

  // ── 3. Group into per-customer maps ────────────────────────────────────────
  const cfgMap = _groupById(configs,    'customerId');
  const delMap = _groupById(deliveries, 'customerId');
  const payMap = _groupById(payments,   'customerId');

  // ── 4. Accumulators ─────────────────────────────────────────────────────────
  let todayMorning = 0, todayEvening = 0, todayMilk   = 0;
  let todayEarning = 0, todayServed  = 0;

  let monthMorning = 0, monthEvening  = 0, monthMilk   = 0;
  let monthEarning = 0, monthOpenDue  = 0;
  let monthPaid    = 0, monthRemain   = 0;

  // ── 5. Per-customer computation (pure in-memory, zero DB queries) ────────────
  for (const customer of customers) {
    const custConfigs    = cfgMap[customer.id] || [];
    const custDeliveries = delMap[customer.id] || [];
    const custPayments   = payMap[customer.id] || [];

    // Build reusable config structures (shared across today + monthly)
    const sortedConfigs = [...custConfigs].sort(
      (a, b) => toDateStr(a.effectiveFrom).localeCompare(toDateStr(b.effectiveFrom))
    );
    const configRanges = buildConfigRanges(sortedConfigs);

    const deliveryMap = {};
    for (const d of custDeliveries) {
      deliveryMap[toDateStr(d.date)] = {
        morningQuantity: parseFloat(d.morningQuantity.toString()),
        eveningQuantity: parseFloat(d.eveningQuantity.toString()),
        isEdited:        d.isEdited,
      };
    }

    // ── Monthly billing (Layer 1 respected via getEffectiveDateRange) ──────────
    const monthRange = getEffectiveDateRange(customer.registrationDate, targetMonth, targetYear);
    if (monthRange) {
      const calc = calculateCustomerBilling({
        customer,
        startDate:  monthRange.startDate,
        endDate:    monthRange.endDate,
        configs:    custConfigs,
        deliveries: custDeliveries,
        payments:   custPayments,
      });

      monthMorning += calc.totalMorningMilk;
      monthEvening += calc.totalEveningMilk;
      monthMilk    += calc.totalMilkDelivered;
      monthEarning += calc.baseAmount;
      monthOpenDue += calc.openingDue;
      monthPaid    += calc.paymentPaid;
      monthRemain  += calc.remainingPayment;
    }

    // ── Today / single-date summary (Layer 1 applied inside calculateDailyMilk) ─
    // calculateDailyMilk internally checks targetDateStr >= registrationDate
    const daily = calculateDailyMilk({
      customer,
      configRanges,
      deliveryMap,
      targetDateStr,
    });

    if (daily.total > 0) {
      todayServed++;
      todayMorning += daily.morningQuantity;
      todayEvening += daily.eveningQuantity;
      todayMilk    += daily.total;
      todayEarning += daily.amount;
    }
  }

  return {
    todaySummary: {
      date:                      targetDateStr,
      totalMorningMilkDelivered: parseFloat(todayMorning.toFixed(2)),
      totalEveningMilkDelivered: parseFloat(todayEvening.toFixed(2)),
      totalMilkDelivered:        parseFloat(todayMilk.toFixed(2)),
      totalCustomersServed:      todayServed,
      totalEarning:              parseFloat(todayEarning.toFixed(2)),
    },
    monthlySummary: {
      month:                     targetMonth,
      year:                      targetYear,
      totalMorningMilkDelivered: parseFloat(monthMorning.toFixed(2)),
      totalEveningMilkDelivered: parseFloat(monthEvening.toFixed(2)),
      totalMilkDelivered:        parseFloat(monthMilk.toFixed(2)),
      totalEarning:              parseFloat(monthEarning.toFixed(2)),
      totalOpeningDue:           parseFloat(monthOpenDue.toFixed(2)),
      totalPaymentReceived:      parseFloat(monthPaid.toFixed(2)),
      totalPendingAmount:        parseFloat(monthRemain.toFixed(2)),
    },
  };
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

const _groupById = (arr, key) => {
  const map = {};
  for (const item of arr) {
    const k = item[key];
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
};

const _buildEmptyDashboard = (targetDateStr, targetMonth, targetYear) => ({
  todaySummary: {
    date:                      targetDateStr,
    totalMorningMilkDelivered: 0,
    totalEveningMilkDelivered: 0,
    totalMilkDelivered:        0,
    totalCustomersServed:      0,
    totalEarning:              0,
  },
  monthlySummary: {
    month:                     targetMonth,
    year:                      targetYear,
    totalMorningMilkDelivered: 0,
    totalEveningMilkDelivered: 0,
    totalMilkDelivered:        0,
    totalEarning:              0,
    totalOpeningDue:           0,
    totalPaymentReceived:      0,
    totalPendingAmount:        0,
  },
});

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { getVendorDashboardData };
