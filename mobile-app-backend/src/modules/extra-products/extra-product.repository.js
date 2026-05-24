'use strict';

const prisma = require('../../config/prisma');

// ─── Single-Record CRUD ──────────────────────────────────────────────────────

const create = async (data) =>
  prisma.extraProductDelivery.create({ data });

const findById = async (id) =>
  prisma.extraProductDelivery.findUnique({ where: { id } });

const update = async (id, data) =>
  prisma.extraProductDelivery.update({ where: { id }, data });

const remove = async (id) =>
  prisma.extraProductDelivery.delete({ where: { id } });

// ─── Query by Customer + Date Range ──────────────────────────────────────────

/**
 * Fetch extra products for a single customer in a date range.
 * Used by the GET /vendor/extra-products endpoint.
 */
const findByCustomerAndPeriod = async (customerId, startDate, endDate) =>
  prisma.extraProductDelivery.findMany({
    where: {
      customerId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

// ─── Bulk Fetch (for billing / dashboard — zero N+1) ─────────────────────────

/**
 * Bulk fetch extra products for multiple customers in a date range.
 * Mirrors the pattern used by billing.repository for deliveries/payments.
 *
 * @param {string[]} customerIds
 * @param {Date}     startDate
 * @param {Date}     endDate
 * @returns {Array<ExtraProductDelivery>}
 */
const getExtraProductsForCustomers = async (customerIds, startDate, endDate) => {
  if (!customerIds.length) return [];
  return prisma.extraProductDelivery.findMany({
    where: {
      customerId: { in: customerIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
};

module.exports = {
  create,
  findById,
  update,
  remove,
  findByCustomerAndPeriod,
  getExtraProductsForCustomers,
};
