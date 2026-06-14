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

module.exports = {
  createRequestSchema,
  renewRequestSchema,
  rejectRequestSchema
};
