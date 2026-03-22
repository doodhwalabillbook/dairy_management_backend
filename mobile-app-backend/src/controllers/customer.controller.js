const customerService = require('../services/customer.service');

/**
 * POST /api/v1/customers
 * Create a new customer.
 */
const createCustomer = async (req, res, next) => {
  try {
    console.log(`[Customer] CREATE request by user=${req.user.id}`);
    const customer = await customerService.createCustomer(req.body, req.user.id);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/customers
 * Get all customers (paginated, filterable).
 */
const getAllCustomers = async (req, res, next) => {
  try {
    console.log(`[Customer] GET ALL request by user=${req.user.id}`);
    const result = await customerService.getAllCustomers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/customers/:id
 * Get a single customer by ID.
 */
const getCustomerById = async (req, res, next) => {
  try {
    console.log(`[Customer] GET BY ID request id=${req.params.id} by user=${req.user.id}`);
    const customer = await customerService.getCustomerById(req.params.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/customers/:id
 * Update an existing customer.
 */
const updateCustomer = async (req, res, next) => {
  try {
    console.log(`[Customer] UPDATE request id=${req.params.id} by user=${req.user.id}`);
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/customers/:id
 * Soft delete a customer (sets isActive = false).
 */
const deleteCustomer = async (req, res, next) => {
  try {
    console.log(`[Customer] SOFT DELETE request id=${req.params.id} by user=${req.user.id}`);
    const customer = await customerService.deleteCustomer(req.params.id, req.user.id);
    res.json({ success: true, message: 'Customer deactivated successfully', data: customer });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
