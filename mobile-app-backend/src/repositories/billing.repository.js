'use strict';

const prisma = require('../config/prisma');

// ─── Config Repository ───────────────────────────────────────────────────────

/**
 * Fetch ALL CustomerMilkConfig rows for the given customer IDs where
 * effectiveFrom <= endDate. This is used by the billing engine to build
 * config ranges for each customer without per-customer DB round-trips.
 *
 * @param {string[]} customerIds
 * @param {Date}     endDate     - Upper bound (usually last day of billing period)
 * @returns {Array<CustomerMilkConfig>}
 */
const getConfigsForCustomers = async (customerIds, endDate) => {
  if (!customerIds.length) return [];
  return prisma.customerMilkConfig.findMany({
    where: {
      customerId:    { in: customerIds },
      effectiveFrom: { lte: endDate },
    },
    orderBy: [
      { customerId:    'asc' },
      { effectiveFrom: 'asc' },
    ],
  });
};

/**
 * Fetch ALL config rows for a single customer (no date filter).
 * Used by milk-delivery service for per-customer monthly view.
 *
 * @param {string} customerId
 * @returns {Array<CustomerMilkConfig>}
 */
const getConfigsForCustomer = async (customerId) => {
  return prisma.customerMilkConfig.findMany({
    where: { customerId },
    orderBy: { effectiveFrom: 'asc' },
  });
};

/**
 * Upsert a CustomerMilkConfig row.
 * Uses the unique constraint (customerId, effectiveFrom) as the upsert key
 * so the same effectiveFrom on update is idempotent (useful for re-runs).
 *
 * @param {Object} data - { customerId, effectiveFrom, morningQuantity, eveningQuantity, ratePerLiter }
 * @returns {CustomerMilkConfig}
 */
const upsertMilkConfig = async (data) => {
  return prisma.customerMilkConfig.upsert({
    where: {
      customerId_effectiveFrom: {
        customerId:    data.customerId,
        effectiveFrom: data.effectiveFrom,
      },
    },
    update: {
      morningQuantity: data.morningQuantity,
      eveningQuantity: data.eveningQuantity,
      ratePerLiter:    data.ratePerLiter,
    },
    create: {
      customerId:      data.customerId,
      effectiveFrom:   data.effectiveFrom,
      morningQuantity: data.morningQuantity,
      eveningQuantity: data.eveningQuantity,
      ratePerLiter:    data.ratePerLiter,
    },
  });
};

// ─── Billing / Payment Repository ────────────────────────────────────────────

/**
 * Bulk fetch deliveries for multiple customers in a date range.
 * Single query — no N+1.
 *
 * @param {string[]} customerIds
 * @param {Date}     startDate
 * @param {Date}     endDate
 * @returns {Array<MilkDelivery>}
 */
const getDeliveriesForCustomers = async (customerIds, startDate, endDate) => {
  if (!customerIds.length) return [];
  return prisma.milkDelivery.findMany({
    where: {
      customerId: { in: customerIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
};

/**
 * Bulk fetch payments for multiple customers in a specific month/year.
 *
 * @param {string[]} customerIds
 * @param {number}   month
 * @param {number}   year
 * @returns {Array<Payment>}
 */
const getPaymentsForCustomers = async (customerIds, month, year) => {
  if (!customerIds.length) return [];
  return prisma.payment.findMany({
    where: {
      customerId: { in: customerIds },
      month,
      year,
    },
  });
};

/**
 * Insert a new payment record.
 *
 * @param {Object} data - Validated payment fields
 * @returns {Payment}
 */
const createPayment = async (data) =>
  prisma.payment.create({
    data,
    include: { customer: { select: { id: true, name: true } } },
  });

/**
 * Fetch payment history for a customer, optionally filtered by month/year.
 *
 * @param {string} customerId
 * @param {Object} opts - { month?, year? }
 * @returns {Array<Payment>}
 */
const findPaymentHistory = async (customerId, { month, year } = {}) => {
  const where = { customerId };
  if (month !== undefined) where.month = month;
  if (year  !== undefined) where.year  = year;

  return prisma.payment.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    select: {
      id:          true,
      amountPaid:  true,
      paymentDate: true,
      month:       true,
      year:        true,
      paymentMode: true,
      notes:       true,
      createdAt:   true,
    },
  });
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Config
  getConfigsForCustomers,
  getConfigsForCustomer,
  upsertMilkConfig,
  // Delivery / Payment bulk
  getDeliveriesForCustomers,
  getPaymentsForCustomers,
  // Payment CRUD
  createPayment,
  findPaymentHistory,
};
