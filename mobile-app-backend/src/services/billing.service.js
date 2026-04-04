const billingRepo = require('../repositories/billing.repository');
const prisma = require('../config/prisma');
const { calculateCustomerMonthlyTotals } = require('./billing.calculator');

/**
 * Fetch billing summary and per-customer breakdown for a given month/year natively cleanly routing to the dynamic JS calculator.
 *
 * @param {Object} params
 * @param {number} params.month       - 1..12
 * @param {number} params.year        - e.g. 2026
 * @param {string} params.filterType  - 'ALL' | 'PAID' | 'UNPAID'
 * @param {string} [params.vendorId]  - Optional vendor filter
 */
const getBilling = async ({ month, year, filterType, vendorId }) => {
  console.log(`[Billing] Fetching billing data month=${month} year=${year} filterType=${filterType}`);

  // 1. Fetch all eligible Customer boundaries natively 
  const customerWhere = { isActive: true };
  if (vendorId) customerWhere.vendorId = vendorId;

  const rawCustomers = await prisma.customer.findMany({
    where: customerWhere,
  });

  if (rawCustomers.length === 0) {
    return _buildEmptyBillingOutput(month, year);
  }

  const customerIds = rawCustomers.map(c => c.id);

  // 2. Fetch Deliveries & Payments securely bound
  const [deliveries, payments] = await Promise.all([
    prisma.milkDelivery.findMany({
      where: {
        customerId: { in: customerIds },
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lte: new Date(Date.UTC(year, month, 0)),
        }
      }
    }),
    prisma.payment.findMany({
      where: {
        customerId: { in: customerIds },
        month,
        year,
      }
    })
  ]);

  // Map into hash maps minimizing O(N) overlaps cleanly
  const deliveryMap = {};
  const paymentMap = {};
  customerIds.forEach(id => {
    deliveryMap[id] = [];
    paymentMap[id] = [];
  });
  
  deliveries.forEach(d => deliveryMap[d.customerId].push(d));
  payments.forEach(p => paymentMap[p.customerId].push(p));

  // 3. Compute derived arrays
  const customersInfo = rawCustomers.map(customer => {
    return calculateCustomerMonthlyTotals({
      customer,
      month,
      year,
      deliveries: deliveryMap[customer.id],
      payments: paymentMap[customer.id]
    });
  });

  // 4. Apply filter mappings cleanly
  const filtered = filterType === 'ALL'
    ? customersInfo
    : customersInfo.filter((c) => c.paymentStatus === filterType);

  // 5. Accumulate sum totals natively globally matching metrics correctly
  const totalBaseAmount       = customersInfo.reduce((s, c) => s + c.baseAmount,      0);
  const totalOpeningDue       = customersInfo.reduce((s, c) => s + c.openingDue,      0);
  const totalAmount           = customersInfo.reduce((s, c) => s + c.totalAmount,      0);
  const totalPaymentPaid      = customersInfo.reduce((s, c) => s + c.paymentPaid,      0);
  const totalRemainingPayment = customersInfo.reduce((s, c) => s + c.remainingPayment, 0);
  const paidCustomersCount    = customersInfo.filter((c) => c.paymentStatus === 'PAID').length;
  const unpaidCustomersCount  = customersInfo.filter((c) => c.paymentStatus === 'UNPAID').length;

  return {
    month,
    year,
    summary: {
      baseAmount:            parseFloat(totalBaseAmount.toFixed(2)),
      openingDue:            parseFloat(totalOpeningDue.toFixed(2)),
      totalAmount:           parseFloat(totalAmount.toFixed(2)),
      totalPaid:             parseFloat(totalPaymentPaid.toFixed(2)),
      remainingAmount:       parseFloat(totalRemainingPayment.toFixed(2)),
      totalCustomers:        customersInfo.length,
      paidCustomersCount,
      unpaidCustomersCount,
    },
    customers: filtered,
  };
};

const _buildEmptyBillingOutput = (month, year) => ({
  month,
  year,
  summary: {
    baseAmount: 0,
    openingDue: 0,
    totalAmount: 0,
    totalPaid: 0,
    remainingAmount: 0,
    totalCustomers: 0,
    paidCustomersCount: 0,
    unpaidCustomersCount: 0,
  },
  customers: [],
});

module.exports = { getBilling };

// ─── Payment Service Methods ──────────────────────────────────────────────────

/**
 * Record a new payment dynamically mapping single calculations accurately isolating SQL.
 */
const recordPayment = async (data, userId) => {
  console.log(`[Billing] Recording payment for customerId=${data.customerId} month=${data.month} year=${data.year}`);

  // Step 1 — Validate customer exists
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  // Step 2 — Persist payment
  await billingRepo.createPayment({
    customerId:  data.customerId,
    amountPaid:  data.amountPaid,
    paymentDate: new Date(data.paymentDate),
    month:       data.month,
    year:        data.year,
    paymentMode: data.paymentMode ?? 'CASH',
    notes:       data.notes ?? null,
    createdBy:   userId,
    updatedBy:   userId,
  });

  // Step 3 — Generate calculation natively mapping bounded queries bypassing old cached SQL queries explicitly
  const [deliveries, payments] = await Promise.all([
    prisma.milkDelivery.findMany({
      where: {
        customerId: data.customerId,
        date: {
          gte: new Date(Date.UTC(data.year, data.month - 1, 1)),
          lte: new Date(Date.UTC(data.year, data.month, 0)),
        }
      }
    }),
    prisma.payment.findMany({
      where: { customerId: data.customerId, month: data.month, year: data.year }
    })
  ]);

  const calc = calculateCustomerMonthlyTotals({
    customer,
    month: data.month,
    year: data.year,
    deliveries,
    payments
  });

  return {
    customerId:    data.customerId,
    month:         data.month,
    year:          data.year,
    baseAmount:    calc.baseAmount,
    openingDue:    calc.openingDue,
    totalAmount:   calc.totalAmount,
    totalPaid:     calc.paymentPaid,
    remainingAmount: calc.remainingPayment,
    paymentStatus: calc.paymentStatus,
  };
};

/**
 * Retrieve payment history for a customer with optional month/year filter.
 */
const getPaymentHistory = async (customerId, { month, year }) => {
  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  const history = await billingRepo.findPaymentHistory(customerId, { month, year });

  // Compute total paid across this history slice
  const totalPaid = history.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);

  return {
    customer,
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    payments: history.map((p) => ({
      ...p,
      amountPaid: parseFloat(p.amountPaid),
    })),
  };
};

module.exports = { getBilling, recordPayment, getPaymentHistory };
