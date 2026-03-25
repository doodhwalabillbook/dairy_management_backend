const { z } = require('zod');

/**
 * Zod schema for creating a customer.
 * Validates all required fields, phone format, and non-negative decimals.
 */
const createCustomerSchema = z.object({
  vendorId: z.string().uuid('vendorId must be a valid UUID'),
  areaId: z.string().uuid('areaId must be a valid UUID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number'),
  address: z.string().min(1, 'Address is required'),
  ratePerLiter: z
    .number({ invalid_type_error: 'ratePerLiter must be a number' })
    .positive('ratePerLiter must be a positive value'),
  morningQuantity: z
    .number({ invalid_type_error: 'morningQuantity must be a number' })
    .min(0, 'morningQuantity must be non-negative')
    .default(0),
  eveningQuantity: z
    .number({ invalid_type_error: 'eveningQuantity must be a number' })
    .min(0, 'eveningQuantity must be non-negative')
    .default(0),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'date must be a valid date string (YYYY-MM-DD)' }),
});

/**
 * For update requests: all fields are optional (PATCH semantics).
 */
const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
