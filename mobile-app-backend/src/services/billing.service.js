const billingRepo = require('../repositories/billing.repository');

/**
 * Fetch billing summary and per-customer breakdown for a given month/year.
 *
 * @param {Object} params
 * @param {number} params.month       - 1..12
 * @param {number} params.year        - e.g. 2026
 * @param {string} params.filterType  - 'ALL' | 'PAID' | 'UNPAID'
 * @param {string} [params.vendorId]  - Optional vendor filter
 */
const getBilling = async ({ month, year, filterType, vendorId }) => {
  console.log(`[Billing] Fetching billing data month=${month} year=${year} filterType=${filterType}`);

  // --- Step 1: Fetch aggregated raw data from DB (single query) ---
  const rawRows = vendorId
    ? await billingRepo.getAggregatedBillingDataByVendor(month, year, vendorId)
    : await billingRepo.getAggregatedBillingData(month, year);

  // --- Step 2: Compute derived fields per customer ---
  const customers = rawRows.map((row) => {
    const ratePerLiter   = parseFloat(row.ratePerLiter)     || 0;
    const totalMilk      = parseFloat(row.totalMilkDelivered) || 0;
    const paymentPaid    = parseFloat(row.paymentPaid)       || 0;
    const totalDays      = Number(row.totalDaysMilkTaken)    || 0;

    const totalAmount       = parseFloat((totalMilk * ratePerLiter).toFixed(2));
    const remainingPayment  = parseFloat((totalAmount - paymentPaid).toFixed(2));
    const paymentStatus     = remainingPayment <= 0 ? 'PAID' : 'UNPAID';

    return {
      customerId:         row.customerId,
      name:               row.name,
      address:            row.address,
      totalDaysMilkTaken: totalDays,
      totalMilkDelivered: parseFloat(totalMilk.toFixed(2)),
      ratePerLiter,
      totalAmount,
      paymentPaid:        parseFloat(paymentPaid.toFixed(2)),
      remainingPayment:   Math.max(0, remainingPayment), // clamp negative to 0
      paymentStatus,
    };
  });

  // --- Step 3: Apply filterType ---
  const filtered = filterType === 'ALL'
    ? customers
    : customers.filter((c) => c.paymentStatus === filterType);

  // --- Step 4: Build summary from ALL customers (before filter) ---
  const totalEarning          = customers.reduce((s, c) => s + c.totalAmount,      0);
  const totalPaymentPaid      = customers.reduce((s, c) => s + c.paymentPaid,      0);
  const totalRemainingPayment = customers.reduce((s, c) => s + c.remainingPayment, 0);
  const paidCustomersCount    = customers.filter((c) => c.paymentStatus === 'PAID').length;
  const unpaidCustomersCount  = customers.filter((c) => c.paymentStatus === 'UNPAID').length;

  return {
    month,
    year,
    summary: {
      totalEarning:          parseFloat(totalEarning.toFixed(2)),
      totalPaymentPaid:      parseFloat(totalPaymentPaid.toFixed(2)),
      totalRemainingPayment: parseFloat(totalRemainingPayment.toFixed(2)),
      totalCustomers:        customers.length,
      paidCustomersCount,
      unpaidCustomersCount,
    },
    customers: filtered,
  };
};

module.exports = { getBilling };

// ─── Payment Service Methods ──────────────────────────────────────────────────

const prisma = require('../config/prisma');

/**
 * Record a new payment and return an up-to-date billing snapshot.
 *
 * Steps:
 *  1. Validate the customer exists
 *  2. Insert payment record
 *  3. Re-fetch billing totals from DB (single aggregate query)
 *  4. Compute derived fields and paymentStatus
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

  // Step 3 — Re-fetch aggregated billing totals (includes the new payment)
  const totals = await billingRepo.getCustomerMonthBillingTotals(
    data.customerId,
    data.month,
    data.year,
  );

  const ratePerLiter       = parseFloat(totals?.ratePerLiter)       || 0;
  const totalMilkDelivered = parseFloat(totals?.totalMilkDelivered) || 0;
  const totalPaid          = parseFloat(totals?.totalPaid)          || 0;

  // Step 4 — Derive billing summary
  const totalAmount      = parseFloat((totalMilkDelivered * ratePerLiter).toFixed(2));
  const remainingAmount  = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

  let paymentStatus;
  if (totalPaid === 0)            paymentStatus = 'UNPAID';
  else if (remainingAmount <= 0)  paymentStatus = 'PAID';
  else                            paymentStatus = 'PARTIAL';

  return {
    customerId:    data.customerId,
    month:         data.month,
    year:          data.year,
    totalAmount,
    totalPaid:     parseFloat(totalPaid.toFixed(2)),
    remainingAmount,
    paymentStatus,
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
