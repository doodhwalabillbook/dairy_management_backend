'use strict';

const { z } = require('zod');

const createRequestSchema = z.object({
  planId: z.string({
    required_error: 'planId is required'
  }).uuid('planId must be a valid UUID'),
  paymentMode: z.enum(['CASH', 'QR_CODE'], {
    required_error: 'paymentMode must be CASH or QR_CODE'
  }),
  remarks: z.string().optional()
});

const renewRequestSchema = z.object({
  paymentMode: z.enum(['CASH', 'QR_CODE'], {
    required_error: 'paymentMode must be CASH or QR_CODE'
  }),
  remarks: z.string().optional()
});

const rejectRequestSchema = z.object({
  remarks: z.string({
    required_error: 'remarks is required for rejection'
  }).min(1, 'remarks cannot be empty')
});

const createPlanSchema = z.object({
  planCode: z.string({
    required_error: 'planCode is required'
  }).min(1, 'planCode cannot be empty').max(50, 'planCode cannot exceed 50 characters'),
  planName: z.string({
    required_error: 'planName is required'
  }).min(1, 'planName cannot be empty').max(100, 'planName cannot exceed 100 characters'),
  description: z.string().optional().nullable(),
  price: z.number({
    required_error: 'price is required'
  }).min(0, 'price cannot be negative'),
  customerLimit: z.number().int().positive().optional().nullable(),
  durationDays: z.number().int().positive().default(30)
});

const updatePlanSchema = z.object({
  planName: z.string().min(1, 'planName cannot be empty').max(100, 'planName cannot exceed 100 characters').optional(),
  description: z.string().optional().nullable(),
  price: z.number().min(0, 'price cannot be negative').optional(),
  customerLimit: z.number().int().positive().optional().nullable(),
  durationDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

const togglePlanStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive is required'
  })
});

module.exports = {
  createRequestSchema,
  renewRequestSchema,
  rejectRequestSchema,
  createPlanSchema,
  updatePlanSchema,
  togglePlanStatusSchema
};
