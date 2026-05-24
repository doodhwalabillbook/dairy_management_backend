'use strict';

const extraProductRepo = require('./extra-product.repository');
const customerRepo     = require('../../repositories/customer.repository');
const { toDateStr }    = require('../../services/billing.calculator');

// ─── Add Extra Product ───────────────────────────────────────────────────────

/**
 * POST /vendor/extra-products
 *
 * Validates:
 *  - Customer exists and belongs to vendor
 *  - Date >= customer.registrationDate (Layer 1)
 */
const addExtraProduct = async (data, vendorId) => {
  const customer = await customerRepo.findCustomerById(data.customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  if (customer.vendorId !== vendorId) {
    const err = new Error('Unauthorized: customer does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  // Layer 1: date must be >= registrationDate
  const regDateStr = toDateStr(customer.registrationDate);
  if (data.date < regDateStr) {
    const err = new Error(`Cannot add product before registration date (${regDateStr})`);
    err.statusCode = 400;
    throw err;
  }

  return extraProductRepo.create({
    customerId:  data.customerId,
    vendorId,
    date:        new Date(data.date + 'T00:00:00Z'),
    productName: data.productName,
    quantity:    data.quantity,
    unit:        data.unit,
    price:       data.price,
    notes:       data.notes || null,
    createdBy:   vendorId,
    updatedBy:   vendorId,
  });
};

// ─── Update Extra Product ────────────────────────────────────────────────────

const updateExtraProduct = async (id, data, vendorId) => {
  const existing = await extraProductRepo.findById(id);
  if (!existing) {
    const err = new Error('Extra product entry not found');
    err.statusCode = 404;
    throw err;
  }
  if (existing.vendorId !== vendorId) {
    const err = new Error('Unauthorized: entry does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  // If date is being changed, validate Layer 1
  if (data.date) {
    const customer = await customerRepo.findCustomerById(existing.customerId);
    const regDateStr = toDateStr(customer.registrationDate);
    if (data.date < regDateStr) {
      const err = new Error(`Cannot set date before registration date (${regDateStr})`);
      err.statusCode = 400;
      throw err;
    }
    data.date = new Date(data.date + 'T00:00:00Z');
  }

  return extraProductRepo.update(id, {
    ...data,
    updatedBy: vendorId,
  });
};

// ─── Delete Extra Product ────────────────────────────────────────────────────

const deleteExtraProduct = async (id, vendorId) => {
  const existing = await extraProductRepo.findById(id);
  if (!existing) {
    const err = new Error('Extra product entry not found');
    err.statusCode = 404;
    throw err;
  }
  if (existing.vendorId !== vendorId) {
    const err = new Error('Unauthorized: entry does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  await extraProductRepo.remove(id);
  return { success: true, message: 'Extra product entry deleted' };
};

// ─── Get Extra Products (by customer + month/year) ───────────────────────────

const getExtraProducts = async (customerId, month, year, vendorId) => {
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  if (customer.vendorId !== vendorId) {
    const err = new Error('Unauthorized: customer does not belong to this vendor');
    err.statusCode = 403;
    throw err;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate   = new Date(Date.UTC(year, month, 0));

  const products = await extraProductRepo.findByCustomerAndPeriod(customerId, startDate, endDate);

  // Compute dynamic total
  const totalAmount = parseFloat(
    products.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0).toFixed(2)
  );

  return {
    customerId,
    month,
    year,
    totalAmount,
    products: products.map((p) => ({
      id:          p.id,
      date:        toDateStr(p.date),
      productName: p.productName,
      quantity:    parseFloat(p.quantity.toString()),
      unit:        p.unit,
      price:       parseFloat(p.price.toString()),
      notes:       p.notes,
    })),
  };
};

module.exports = {
  addExtraProduct,
  updateExtraProduct,
  deleteExtraProduct,
  getExtraProducts,
};
