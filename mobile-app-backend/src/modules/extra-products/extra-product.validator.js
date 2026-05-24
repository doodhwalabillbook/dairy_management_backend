'use strict';

const { z } = require('zod');

// ─── Allowed unit values ─────────────────────────────────────────────────────

const VALID_UNITS = ['ml', 'ltr', 'kg', 'gm', 'packet'];

// ─── Create ──────────────────────────────────────────────────────────────────

const createExtraProductSchema = z.object({
  customerId:  z.string().uuid('customerId must be a valid UUID'),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  productName: z.string().min(1, 'productName is required').max(100),
  quantity:    z.number({ invalid_type_error: 'quantity must be a number' }).positive('quantity must be > 0'),
  unit:        z.enum(VALID_UNITS, { errorMap: () => ({ message: `unit must be one of: ${VALID_UNITS.join(', ')}` }) }),
  price:       z.number({ invalid_type_error: 'price must be a number' }).min(0, 'price cannot be negative'),
  notes:       z.string().max(255).optional(),
});

// ─── Update ──────────────────────────────────────────────────────────────────

const updateExtraProductSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  productName: z.string().min(1).max(100).optional(),
  quantity:    z.number().positive('quantity must be > 0').optional(),
  unit:        z.enum(VALID_UNITS, { errorMap: () => ({ message: `unit must be one of: ${VALID_UNITS.join(', ')}` }) }).optional(),
  price:       z.number().min(0, 'price cannot be negative').optional(),
  notes:       z.string().max(255).optional(),
});

// ─── Query (GET list) ────────────────────────────────────────────────────────

const getExtraProductsSchema = z.object({
  customerId: z.string().uuid('customerId must be a valid UUID'),
  month:      z.string().regex(/^(1[0-2]|[1-9])$/, 'Month must be 1–12'),
  year:       z.string().length(4).regex(/^\d+$/, 'Year must be a 4-digit number'),
});

// ─── Middleware helpers ──────────────────────────────────────────────────────

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Body validation failed', errors: err.errors });
  }
};

const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Query validation failed', errors: err.errors });
  }
};

module.exports = {
  createExtraProductSchema,
  updateExtraProductSchema,
  getExtraProductsSchema,
  validateBody,
  validateQuery,
};
