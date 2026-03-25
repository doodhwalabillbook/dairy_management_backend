const customerRepo = require('../repositories/customer.repository');
const vendorRepo = require('../repositories/vendor.repository');
const areaRepo = require('../modules/area/area.repository');

/**
 * Create a new customer.
 * - Validates vendor existence
 * - Validates area existence
 * - Guards against duplicate phone numbers
 * - Populates createdBy / updatedBy from the authenticated user
 */
const createCustomer = async (data, userId) => {
  // Validate vendor exists
  const vendor = await vendorRepo.findVendorById(data.vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate area exists
  const area = await areaRepo.getAreaById(data.areaId);
  if (!area) {
    const error = new Error('Area not found');
    error.statusCode = 404;
    throw error;
  }

  // Check for duplicate phone
  const duplicate = await customerRepo.customerPhoneExists(data.phone);
  if (duplicate) {
    const error = new Error('Phone number already exists');
    error.statusCode = 409;
    throw error;
  }

  return customerRepo.createCustomer({
    ...data,
    ratePerLiter: data.ratePerLiter,
    morningQuantity: data.morningQuantity ?? 0,
    eveningQuantity: data.eveningQuantity ?? 0,
    registrationDate: new Date(data.registrationDate),
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });
};

/**
 * Get paginated customers with optional filtering by isActive / vendorId.
 */
const getAllCustomers = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;

  // Parse isActive filter: ?isActive=true|false
  let isActive;
  if (query.isActive !== undefined) {
    isActive = query.isActive === 'true';
  }

  const vendorId = query.vendorId || undefined;
  const areaId = query.areaId || undefined;

  return customerRepo.findAllCustomers({ page, limit, isActive, vendorId, areaId });
};

/**
 * Get a single customer by ID.
 * Throws 404 if not found.
 */
const getCustomerById = async (id) => {
  const customer = await customerRepo.findCustomerById(id);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  return customer;
};

/**
 * Update an existing customer.
 * - Validates vendor change if vendorId is in the payload
 * - Guards against phone conflicts on update
 */
const updateCustomer = async (id, data, userId) => {
  // Ensure customer exists
  const existing = await customerRepo.findCustomerById(id);
  if (!existing) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  // If vendorId is being changed, validate new vendor
  if (data.vendorId) {
    const vendor = await vendorRepo.findVendorById(data.vendorId);
    if (!vendor) {
      const error = new Error('Vendor not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // If areaId is being changed, validate new area
  if (data.areaId) {
    const area = await areaRepo.getAreaById(data.areaId);
    if (!area) {
      const error = new Error('Area not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // If phone is being changed, check for duplicates (exclude current record)
  if (data.phone) {
    const duplicate = await customerRepo.customerPhoneExists(data.phone, id);
    if (duplicate) {
      const error = new Error('Phone number already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  // Build update payload
  const updatePayload = {
    ...data,
    updatedBy: userId,
    ...(data.registrationDate ? { registrationDate: new Date(data.registrationDate) } : {}),
  };

  return customerRepo.updateCustomer(id, updatePayload);
};

/**
 * Soft delete a customer (sets isActive = false).
 */
const deleteCustomer = async (id, userId) => {
  const existing = await customerRepo.findCustomerById(id);
  if (!existing) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  return customerRepo.softDeleteCustomer(id, userId);
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
