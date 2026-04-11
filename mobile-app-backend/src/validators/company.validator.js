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
  companyId:        z.string().uuid('companyId must be a valid UUID'),
  name:             z.string().min(2, 'Name is required'),
  // mobileNumber is the login credential (used for JWT auth)
  mobileNumber:     z.string().regex(/^[0-9]{10}$/, 'mobileNumber must be a 10-digit number'),
  // pin is hashed and stored on the User record for login
  pin:              z.string().min(4, 'PIN must be at least 4 digits').max(6, 'PIN must be at most 6 digits'),
  email:            z.string().email().optional().or(z.literal('')),
  phone:            z.string().regex(/^[0-9]{10}$/).optional(),
  area:             z.string().optional(),
  address:          z.string().optional(),
});

const updateCompanySchema = createCompanySchema.partial();

module.exports = {
  createCompanySchema,
  createVendorSchema,
  updateCompanySchema,
};
