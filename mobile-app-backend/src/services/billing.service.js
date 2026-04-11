'use strict';

const billingRepo = require('../repositories/billing.repository');
const prisma      = require('../config/prisma');
const {
  getEffectiveDateRange,
  calculateCustomerBilling,
  toDateStr,
  utcToday,
} = require('./billing.calculator');

// ─── Billing Service ──────────────────────────────────────────────────────────

/**
 * Fetch full billing summary for a given month/year.
 *
 * Three-layer rule enforced per customer:
 *   Layer 1 — Date Boundary : getEffectiveDateRange() → skips customers not yet registered
 *   Layer 2 — Config        : calculateCustomerBilling() applies effectiveFrom ranges
 *   Layer 3 — Override      : calculateCustomerBilling() applies MilkDelivery overrides
 *
 * Query strategy (zero N+1):
 *   1. One query → active customers (optional vendorId filter)
 *   2. One query → all CustomerMilkConfig rows (effectiveFrom ≤ last day of month)
 *   3. One query → all MilkDelivery rows in the month
 *   4. One query → all Payment rows for the month
 *   5. In-memory → per-customer date range + billing calculation
 *
 * @param {Object} params
 * @param {number}  params.month
 * @param {number}  params.year
 * @param {string}  params.filterType - 'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'
 * @param {string}  [params.vendorId]
 * @returns {Object} Billing report
 */
const getBilling = async ({ month, year, filterType, vendorId }) => {
  console.log(`[Billing] month=${month} year=${year} filter=${filterType} vendor=${vendorId || 'ALL'}`);

  // ── 1. Fetch active customers ───────────────────────────────────────────────
  const customerWhere = { isActive: true };
  if (vendorId) customerWhere.vendorId = vendorId;

  const customers = await prisma.customer.findMany({ where: customerWhere });
  if (customers.length === 0) return _buildEmptyBillingOutput(month, year);

  const customerIds = customers.map((c) => c.id);

  // ── 2. Global date bounds for bulk DB fetches ───────────────────────────────
  //    We fetch from the 1st of the month (widest possible range).
  //    Per-customer startDate is applied in-memory via getEffectiveDateRange().
  const globalStart    = new Date(Date.UTC(year, month - 1, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
  const globalEnd      = utcToday() < lastDayOfMonth ? utcToday() : lastDayOfMonth;

  // ── 3. Bulk fetch (3 queries, no N+1) ──────────────────────────────────────
  const [configs, deliveries, payments] = await Promise.all([
    billingRepo.getConfigsForCustomers(customerIds, lastDayOfMonth),
    billingRepo.getDeliveriesForCustomers(customerIds, globalStart, globalEnd),
    billingRepo.getPaymentsForCustomers(customerIds, month, year),
  ]);

  // ── 4. Group into per-customer maps { customerId → [...] } ──────────────────
  const cfgMap = _groupById(configs,    'customerId');
  const delMap = _groupById(deliveries, 'customerId');
  const payMap = _groupById(payments,   'customerId');

  // ── 5. Compute billing per customer (in-memory, zero DB queries) ─────────────
  const customersInfo = [];

  for (const customer of customers) {
    // Layer 1: get effective date range for THIS customer
    const range = getEffectiveDateRange(customer.registrationDate, month, year);

    // Skip customers not yet registered in this billing period
    if (!range) continue;

    customersInfo.push(
      calculateCustomerBilling({
        customer,
        startDate:  range.startDate,   // correctly clamped to registrationDate
        endDate:    range.endDate,
        configs:    cfgMap[customer.id]  || [],
        deliveries: delMap[customer.id]  || [],
        payments:   payMap[customer.id]  || [],
      })
    );
  }

  // ── 6. Apply filter ─────────────────────────────────────────────────────────
  const filtered =
    filterType === 'ALL'
      ? customersInfo
      : customersInfo.filter((c) => c.paymentStatus === filterType);

  // ── 7. Aggregate summary ────────────────────────────────────────────────────
  const summary = _aggregateSummary(customersInfo);

  return { month, year, summary, customers: filtered };
};

// ─── Payment Service ──────────────────────────────────────────────────────────

/**
 * Record a new payment and return the updated billing summary for that customer.
 *
 * @param {Object} data   - Validated payment fields
 * @param {string} userId - Authenticated user ID
 */
const recordPayment = async (data, userId) => {
  console.log(`[Payment] customerId=${data.customerId} month=${data.month} year=${data.year}`);

  // 1. Validate customer exists
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Persist payment
  await billingRepo.createPayment({
    customerId:  data.customerId,
    amountPaid:  data.amountPaid,
    paymentDate: new Date(data.paymentDate),
    month:       data.month,
    year:        data.year,
    paymentMode: data.paymentMode ?? 'CASH',
    notes:       data.notes ?? null,
    createdBy:   userId || null,
    updatedBy:   userId || null,
  });

  // 3. Re-compute billing using correct date range (Layer 1 applied)
  const lastDayOfMonth = new Date(Date.UTC(data.year, data.month, 0));
  const range = getEffectiveDateRange(customer.registrationDate, data.month, data.year);

  // If customer wasn't registered in this billing period yet, return zeros
  if (!range) {
    return {
      customerId:      data.customerId,
      month:           data.month,
      year:            data.year,
      baseAmount:      0,
      openingDue:      parseFloat((customer.remainingAmount || 0).toString()),
      totalAmount:     parseFloat((customer.remainingAmount || 0).toString()),
      totalPaid:       parseFloat(data.amountPaid.toString()),
      remainingAmount: 0,
      paymentStatus:   'PAID',
    };
  }

  const [configs, deliveries, payments] = await Promise.all([
    billingRepo.getConfigsForCustomers([data.customerId], lastDayOfMonth),
    billingRepo.getDeliveriesForCustomers([data.customerId], range.startDate, range.endDate),
    billingRepo.getPaymentsForCustomers([data.customerId], data.month, data.year),
  ]);

  const calc = calculateCustomerBilling({
    customer,
    startDate:  range.startDate,
    endDate:    range.endDate,
    configs,
    deliveries,
    payments,
  });

  return {
    customerId:      data.customerId,
    month:           data.month,
    year:            data.year,
    baseAmount:      calc.baseAmount,
    openingDue:      calc.openingDue,
    totalAmount:     calc.totalAmount,
    totalPaid:       calc.paymentPaid,
    remainingAmount: calc.remainingPayment,
    paymentStatus:   calc.paymentStatus,
  };
};

/**
 * Retrieve payment history for a customer.
 *
 * @param {string} customerId
 * @param {Object} opts - { month?, year? }
 */
const getPaymentHistory = async (customerId, { month, year }) => {
  const customer = await prisma.customer.findUnique({
    where:  { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  const history   = await billingRepo.findPaymentHistory(customerId, { month, year });
  const totalPaid = history.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);

  return {
    customer,
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    payments:  history.map((p) => ({ ...p, amountPaid: parseFloat(p.amountPaid) })),
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

const _aggregateSummary = (customersInfo) => ({
  baseAmount:            parseFloat(customersInfo.reduce((s, c) => s + c.baseAmount,       0).toFixed(2)),
  openingDue:            parseFloat(customersInfo.reduce((s, c) => s + c.openingDue,       0).toFixed(2)),
  totalAmount:           parseFloat(customersInfo.reduce((s, c) => s + c.totalAmount,      0).toFixed(2)),
  totalPaid:             parseFloat(customersInfo.reduce((s, c) => s + c.paymentPaid,      0).toFixed(2)),
  remainingAmount:       parseFloat(customersInfo.reduce((s, c) => s + c.remainingPayment, 0).toFixed(2)),
  totalCustomers:        customersInfo.length,
  paidCustomersCount:    customersInfo.filter((c) => c.paymentStatus === 'PAID').length,
  unpaidCustomersCount:  customersInfo.filter((c) => c.paymentStatus === 'UNPAID').length,
  partialCustomersCount: customersInfo.filter((c) => c.paymentStatus === 'PARTIAL').length,
});

const _buildEmptyBillingOutput = (month, year) => ({
  month,
  year,
  summary: {
    baseAmount: 0, openingDue: 0, totalAmount: 0, totalPaid: 0,
    remainingAmount: 0, totalCustomers: 0,
    paidCustomersCount: 0, unpaidCustomersCount: 0, partialCustomersCount: 0,
  },
  customers: [],
});

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { getBilling, recordPayment, getPaymentHistory };
