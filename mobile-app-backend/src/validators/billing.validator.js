const { z } = require('zod');

/**
 * Zod schema for billing query parameters.
 * Coerces string query params to numbers.
 */
const billingQuerySchema = z.object({
  month: z.coerce
    .number({ invalid_type_error: 'month must be a number' })
    .int()
    .min(1, 'month must be between 1 and 12')
    .max(12, 'month must be between 1 and 12'),

  year: z.coerce
    .number({ invalid_type_error: 'year must be a number' })
    .int()
    .min(2000, 'year must be 2000 or later'),

  vendorId: z.string().uuid('vendorId must be a valid UUID').optional(),

  filterType: z
    .enum(['ALL', 'PAID', 'UNPAID'], {
      errorMap: () => ({ message: 'filterType must be ALL, PAID, or UNPAID' }),
    })
    .default('ALL'),
});

/**
 * Middleware to validate query params using a Zod schema.
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Validation failed', errors: err.errors });
  }
};

/**
 * Zod schema for recording a payment (request body).
 */
const createPaymentSchema = z.object({
  customerId: z.string().uuid('customerId must be a valid UUID'),
  amountPaid: z
    .number({ invalid_type_error: 'amountPaid must be a number' })
    .positive('amountPaid must be greater than 0'),
  paymentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'paymentDate must be a valid date (YYYY-MM-DD)' }),
  month: z.coerce
    .number({ invalid_type_error: 'month must be a number' })
    .int()
    .min(1, 'month must be between 1 and 12')
    .max(12, 'month must be between 1 and 12'),
  year: z.coerce
    .number({ invalid_type_error: 'year must be a number' })
    .int()
    .min(2000, 'year must be 2000 or later'),
  paymentMode: z
    .enum(['CASH', 'UPI', 'CARD'], {
      errorMap: () => ({ message: 'paymentMode must be CASH, UPI, or CARD' }),
    })
    .default('CASH'),
  extraAmount: z
    .number({ invalid_type_error: 'extraAmount must be a number' })
    .min(0, 'extraAmount must be non-negative')
    .default(0),
  extraDescription: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Zod schema for payment history query params.
 */
const paymentHistoryQuerySchema = z.object({
  month: z.coerce
    .number({ invalid_type_error: 'month must be a number' })
    .int()
    .min(1)
    .max(12)
    .optional(),
  year: z.coerce
    .number({ invalid_type_error: 'year must be a number' })
    .int()
    .min(2000)
    .optional(),
});

module.exports = { billingQuerySchema, validateQuery, createPaymentSchema, paymentHistoryQuerySchema };
