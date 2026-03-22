const prisma = require('../config/prisma');

/**
 * Create a new customer record.
 * @param {Object} data - Customer data including vendorId, createdBy, updatedBy, etc.
 */
const createCustomer = async (data) =>
  prisma.customer.create({
    data,
    include: { vendor: { select: { id: true, name: true } } },
  });

/**
 * Get paginated list of customers with optional filters.
 * @param {Object} options - { page, limit, isActive, vendorId }
 */
const findAllCustomers = async ({ page = 1, limit = 10, isActive, vendorId }) => {
  const skip = (page - 1) * limit;

  // Build dynamic where clause
  const where = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (vendorId) where.vendorId = vendorId;

  const [total, data] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { id: true, name: true } } },
    }),
  ]);

  return { total, page, limit, data };
};

/**
 * Find a single customer by primary key.
 * @param {string} id - UUID of the customer
 */
const findCustomerById = async (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: { vendor: { select: { id: true, name: true, phone: true } } },
  });

/**
 * Update an existing customer.
 * @param {string} id - UUID of the customer
 * @param {Object} data - Fields to update
 */
const updateCustomer = async (id, data) =>
  prisma.customer.update({
    where: { id },
    data,
    include: { vendor: { select: { id: true, name: true } } },
  });

/**
 * Soft delete: set isActive = false instead of removing the record.
 * @param {string} id - UUID of the customer
 * @param {string} updatedBy - ID of the user performing the delete
 */
const softDeleteCustomer = async (id, updatedBy) =>
  prisma.customer.update({
    where: { id },
    data: { isActive: false, updatedBy },
  });

/**
 * Check whether a phone number already exists (with optional exclusion for updates).
 * @param {string} phone - Phone number to check
 * @param {string|null} excludeId - Customer ID to exclude from the check
 */
const customerPhoneExists = async (phone, excludeId = null) =>
  prisma.customer.findFirst({
    where: {
      phone,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

module.exports = {
  createCustomer,
  findAllCustomers,
  findCustomerById,
  updateCustomer,
  softDeleteCustomer,
  customerPhoneExists,
};
