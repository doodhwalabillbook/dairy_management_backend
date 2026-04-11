'use strict';

const customerRepo = require('../repositories/customer.repository');
const billingRepo  = require('../repositories/billing.repository');
const vendorRepo   = require('../repositories/vendor.repository');
const areaRepo     = require('../modules/area/area.repository');

// ─── Create Customer ──────────────────────────────────────────────────────────

/**
 * POST /customers
 *
 * Creates a Customer and its initial CustomerMilkConfig in a single transaction.
 * The first config's effectiveFrom = registrationDate.
 *
 * @param {Object} data   - Validated request body
 * @param {string} userId - Authenticated user ID
 * @returns {Customer}
 */
const createCustomer = async (data, userId) => {
  // 1. Validate vendor
  const vendor = await vendorRepo.findVendorById(data.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Validate area
  const area = await areaRepo.getAreaById(data.areaId);
  if (!area) {
    const err = new Error('Area not found');
    err.statusCode = 404;
    throw err;
  }

  // 3. Check phone uniqueness per vendor
  const duplicate = await customerRepo.customerPhoneExists(data.phone, data.vendorId);
  if (duplicate) {
    const err = new Error('Phone number already registered under this vendor');
    err.statusCode = 409;
    throw err;
  }

  // 4. Build Customer payload (NO rate/qty fields on Customer table)
  const customerData = {
    vendorId:         data.vendorId,
    areaId:           data.areaId,
    name:             data.name,
    phone:            data.phone,
    address:          data.address,
    remainingAmount:  data.remainingAmount ?? 0,
    registrationDate: new Date(data.registrationDate + 'T00:00:00Z'),
    isActive:         true,
    createdBy:        userId,
    updatedBy:        userId,
  };

  // 5. Config payload — effectiveFrom = registrationDate
  const configData = {
    effectiveFrom:   new Date(data.registrationDate + 'T00:00:00Z'),
    morningQuantity: data.morningQuantity ?? 0,
    eveningQuantity: data.eveningQuantity ?? 0,
    ratePerLiter:    data.ratePerLiter,
  };

  // 6. Atomic create (Customer + CustomerMilkConfig in one transaction)
  return customerRepo.createCustomerWithConfig(customerData, configData);
};

// ─── Get All Customers ────────────────────────────────────────────────────────

/**
 * GET /customers
 * Paginated and filterable.
 *
 * @param {Object} query - { page, limit, isActive, vendorId, areaId }
 */
const getAllCustomers = async (query) => {
  const page  = parseInt(query.page,  10) || 1;
  const limit = parseInt(query.limit, 10) || 10;

  let isActive;
  if (query.isActive !== undefined) {
    isActive = query.isActive === 'true';
  }

  return customerRepo.findAllCustomers({
    page,
    limit,
    isActive,
    vendorId: query.vendorId || undefined,
    areaId:   query.areaId   || undefined,
  });
};

// ─── Get Customer By ID ───────────────────────────────────────────────────────

/**
 * GET /customers/:id
 *
 * @param {string} id
 */
const getCustomerById = async (id) => {
  const customer = await customerRepo.findCustomerById(id);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
};

// ─── Update Customer ──────────────────────────────────────────────────────────

/**
 * PUT /customers/:id
 *
 * Two operations may happen (independently):
 *   A) Identity update  — name, phone, address, areaId, remainingAmount
 *   B) Config update    — insert new CustomerMilkConfig row (never mutate old)
 *
 * If config fields + effectiveFrom are provided → both A and B run.
 * If only identity fields → only A runs.
 * Validator already guarantees effectiveFrom is present when config fields are.
 *
 * @param {string} id     - Customer ID
 * @param {Object} data   - Validated update body
 * @param {string} userId - Authenticated user ID
 * @returns {{ customer, newConfig? }}
 */
const updateCustomer = async (id, data, userId) => {
  // 1. Ensure customer exists
  const existing = await customerRepo.findCustomerById(id);
  if (!existing) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Validate area change
  if (data.areaId) {
    const area = await areaRepo.getAreaById(data.areaId);
    if (!area) {
      const err = new Error('Area not found');
      err.statusCode = 404;
      throw err;
    }
  }

  // 3. Guard phone uniqueness (per vendor)
  if (data.phone) {
    const duplicate = await customerRepo.customerPhoneExists(data.phone, existing.vendorId, id);
    if (duplicate) {
      const err = new Error('Phone number already registered under this vendor');
      err.statusCode = 409;
      throw err;
    }
  }

  // 4. Build identity update payload (strip config/effectiveFrom fields)
  const { morningQuantity, eveningQuantity, ratePerLiter, effectiveFrom, ...identityFields } = data;

  const identityPayload = {
    ...identityFields,
    updatedBy: userId,
  };

  // 5. Apply identity update
  const updatedCustomer = await customerRepo.updateCustomer(id, identityPayload);

  // 6. If config fields provided → insert new CustomerMilkConfig (immutable versioning)
  let newConfig = null;
  const hasConfigUpdate =
    morningQuantity !== undefined ||
    eveningQuantity !== undefined ||
    ratePerLiter    !== undefined;

  if (hasConfigUpdate && effectiveFrom) {
    const effectiveDateObj = new Date(effectiveFrom + 'T00:00:00Z');

    // Validation: effectiveFrom cannot be prior to customer's registration boundary
    if (effectiveDateObj < existing.registrationDate) {
      const err = new Error('effectiveFrom cannot be earlier than the customer registration date');
      err.statusCode = 400;
      throw err;
    }

    newConfig = await billingRepo.upsertMilkConfig({
      customerId:      id,
      effectiveFrom:   effectiveDateObj,
      morningQuantity: morningQuantity ?? 0,
      eveningQuantity: eveningQuantity ?? 0,
      ratePerLiter:    ratePerLiter    ?? 0,
    });
  }

  return {
    customer: updatedCustomer,
    ...(newConfig ? { newConfig } : {}),
  };
};

// ─── Delete Customer ──────────────────────────────────────────────────────────

/**
 * DELETE /customers/:id  (soft delete)
 *
 * @param {string} id
 * @param {string} userId
 */
const deleteCustomer = async (id, userId) => {
  const existing = await customerRepo.findCustomerById(id);
  if (!existing) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customerRepo.softDeleteCustomer(id, userId);
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
