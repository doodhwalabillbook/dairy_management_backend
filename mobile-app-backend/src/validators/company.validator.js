const { z } = require('zod');

const createCompanySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
});

const createVendorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^[0-9]{10}$/, '10-digit phone required'),
  email: z.string().email().optional().or(z.literal('')),
  area: z.string().optional(),
  address: z.string().optional(),
  companyId: z.string().uuid(),
});

const updateCompanySchema = createCompanySchema.partial();

module.exports = {
  createCompanySchema,
  createVendorSchema,
  updateCompanySchema,
};
