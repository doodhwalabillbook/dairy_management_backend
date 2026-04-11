'use strict';

const prisma = require('../config/prisma');

// ─── Customer CRUD ───────────────────────────────────────────────────────────

/**
 * Atomically create a Customer + its first CustomerMilkConfig.
 * Wrapped in a Prisma transaction so both rows succeed or both roll back.
 *
 * @param {Object} customerData - Customer fields (no rate/qty)
 * @param {Object} configData   - { effectiveFrom, morningQuantity, eveningQuantity, ratePerLiter }
 * @returns {Customer} - The created customer with vendor/area relations
 */
const createCustomerWithConfig = async (customerData, configData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the customer record
    const customer = await tx.customer.create({
      data: customerData,
      include: {
        vendor: { select: { id: true, name: true } },
        area:   { select: { id: true, name: true } },
      },
    });

    // 2. Seed the first config version
    await tx.customerMilkConfig.create({
      data: {
        customerId:      customer.id,
        effectiveFrom:   configData.effectiveFrom,
        morningQuantity: configData.morningQuantity,
        eveningQuantity: configData.eveningQuantity,
        ratePerLiter:    configData.ratePerLiter,
      },
    });

    return customer;
  });
};

/**
 * Get paginated list of customers with optional filters.
 *
 * @param {Object} opts - { page, limit, isActive?, vendorId?, areaId? }
 * @returns {{ total, page, limit, data }}
 */
const findAllCustomers = async ({ page = 1, limit = 10, isActive, vendorId, areaId }) => {
  const skip  = (page - 1) * limit;
  const where = {};
  if (isActive !== undefined) where.isActive  = isActive;
  if (vendorId)               where.vendorId  = vendorId;
  if (areaId)                 where.areaId    = areaId;

  const [total, data] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor:      { select: { id: true, name: true } },
        area:        { select: { id: true, name: true } },
        milkConfigs: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1, // latest active config for display
        },
      },
    }),
  ]);

  return { total, page, limit, data };
};

/**
 * Find a single customer by primary key, including their latest config.
 *
 * @param {string} id
 * @returns {Customer | null}
 */
const findCustomerById = async (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      vendor:      { select: { id: true, name: true, phone: true } },
      area:        { select: { id: true, name: true } },
      milkConfigs: { orderBy: { effectiveFrom: 'desc' } }, // all versions, latest first
    },
  });

/**
 * Update a customer's identity fields only (name, phone, address, etc.).
 * Config updates are handled separately via upsertMilkConfig.
 *
 * @param {string} id
 * @param {Object} data - Fields to update (no rate/qty)
 * @returns {Customer}
 */
const updateCustomer = async (id, data) =>
  prisma.customer.update({
    where: { id },
    data,
    include: {
      vendor:      { select: { id: true, name: true } },
      area:        { select: { id: true, name: true } },
      milkConfigs: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
    },
  });

/**
 * Soft delete: set isActive = false.
 *
 * @param {string} id
 * @param {string} updatedBy
 * @returns {Customer}
 */
const softDeleteCustomer = async (id, updatedBy) =>
  prisma.customer.update({
    where: { id },
    data:  { isActive: false, updatedBy },
  });

/**
 * Check if a phone number already exists for the same vendor.
 * (Phone is now unique per vendor, not globally.)
 *
 * @param {string} phone
 * @param {string} vendorId
 * @param {string|null} excludeId - Exclude this customer ID (for updates)
 * @returns {Customer | null}
 */
const customerPhoneExists = async (phone, vendorId, excludeId = null) =>
  prisma.customer.findFirst({
    where: {
      phone,
      vendorId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  createCustomerWithConfig,
  findAllCustomers,
  findCustomerById,
  updateCustomer,
  softDeleteCustomer,
  customerPhoneExists,
};
