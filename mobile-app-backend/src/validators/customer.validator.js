'use strict';

const { z } = require('zod');

// ─── Create Customer ──────────────────────────────────────────────────────────

/**
 * POST /customers
 * Config fields (morning/evening qty, rate) are REQUIRED on create
 * because they seed the first CustomerMilkConfig row.
 * effectiveFrom defaults to registrationDate — no need to pass separately.
 */
const createCustomerSchema = z.object({
  vendorId: z.string().uuid('vendorId must be a valid UUID'),
  areaId:   z.string().uuid('areaId must be a valid UUID'),

  name:    z.string().min(2, 'Name must be at least 2 characters'),
  phone:   z.string().regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number'),
  address: z.string().min(1, 'Address is required'),

  registrationDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'registrationDate must be a valid date (YYYY-MM-DD)',
    }),

  // Initial milk config — required at customer creation
  morningQuantity: z
    .number({ invalid_type_error: 'morningQuantity must be a number' })
    .min(0, 'morningQuantity must be non-negative')
    .default(0),
  eveningQuantity: z
    .number({ invalid_type_error: 'eveningQuantity must be a number' })
    .min(0, 'eveningQuantity must be non-negative')
    .default(0),
  ratePerLiter: z
    .number({ invalid_type_error: 'ratePerLiter must be a number' })
    .positive('ratePerLiter must be greater than 0'),

  // Opening due (carried-forward balance)
  remainingAmount: z.number().min(0).default(0),
});

// ─── Update Customer ──────────────────────────────────────────────────────────

/**
 * PUT /customers/:id
 *
 * Rules:
 *  - Identity fields (name, phone, address, areaId, remainingAmount) are all optional.
 *  - If ANY config field (morningQuantity / eveningQuantity / ratePerLiter) is provided,
 *    `effectiveFrom` becomes REQUIRED — this triggers a new CustomerMilkConfig insert.
 *  - Old config records are NEVER modified.
 */
const updateCustomerSchema = z
  .object({
    name:    z.string().min(2).optional(),
    phone:   z.string().regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number').optional(),
    address: z.string().min(1).optional(),
    areaId:  z.string().uuid('areaId must be a valid UUID').optional(),
    remainingAmount: z.number().min(0).optional(),

    // Config update fields (must come together with effectiveFrom)
    morningQuantity: z
      .number({ invalid_type_error: 'morningQuantity must be a number' })
      .min(0)
      .optional(),
    eveningQuantity: z
      .number({ invalid_type_error: 'eveningQuantity must be a number' })
      .min(0)
      .optional(),
    ratePerLiter: z
      .number({ invalid_type_error: 'ratePerLiter must be a number' })
      .positive()
      .optional(),

    effectiveFrom: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'effectiveFrom must be a valid date (YYYY-MM-DD)',
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasConfigField =
      data.morningQuantity !== undefined ||
      data.eveningQuantity !== undefined ||
      data.ratePerLiter    !== undefined;

    if (hasConfigField && !data.effectiveFrom) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        path:    ['effectiveFrom'],
        message: 'effectiveFrom is required when updating morningQuantity, eveningQuantity, or ratePerLiter',
      });
    }
  });

module.exports = { createCustomerSchema, updateCustomerSchema };
