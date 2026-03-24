const { z } = require('zod');

const loginSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Must be a 10-digit Indian mobile number'),
  pin: z.string().regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits'),
});

const resetPinSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Must be a 10-digit Indian mobile number'),
  currentPin: z.string().regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits'),
  newPin: z.string().regex(/^[0-9]{4}$/, 'PIN must be exactly 4 digits'),
});

const adminProvisionSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Must be a 10-digit Indian mobile number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const vendorRegistrationSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    address: z.string().min(1, 'Address is required'),
    mobileNumber: z
      .string()
      .regex(/^[0-9]{10}$/, 'Mobile number must be a valid 10-digit number'),
    registrationDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'registrationDate must be a valid date' }),
    billingStartDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'billingStartDate must be a valid date' }),
    pin: z
      .string()
      .regex(/^[0-9]{4,6}$/, 'PIN must be numeric and 4–6 digits'),
  })
  .refine(
    (data) => new Date(data.billingStartDate) >= new Date(data.registrationDate),
    { message: 'billingStartDate must be on or after registrationDate', path: ['billingStartDate'] }
  );

const vendorUpdateSchema = z
  .object({
    name: z.string().min(3).optional(),
    address: z.string().min(1).optional(),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be a valid 10-digit number').optional(),
    registrationDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
    billingStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
    pin: z.string().regex(/^[0-9]{4,6}$/, 'PIN must be numeric and 4–6 digits').optional(),
  })
  .refine(
    (data) => {
      if (data.billingStartDate && data.registrationDate) {
        return new Date(data.billingStartDate) >= new Date(data.registrationDate);
      }
      return true;
    },
    { message: 'billingStartDate must be on or after registrationDate', path: ['billingStartDate'] }
  );

const vendorStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], { required_error: 'Status must be ACTIVE or INACTIVE' })
});

const vendorFiltersSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
  size: z.string().regex(/^\d+$/).transform(Number).optional().default("10"),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  mobileNumber: z.string().optional()
});

const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Validation failed', errors: err.errors });
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

const vendorLoginSchema = z.object({
  mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Must be a 10-digit Indian mobile number'),
  pin: z.string().regex(/^[0-9]{4,6}$/, 'PIN must be exactly 4 to 6 digits'),
});

module.exports = {
  loginSchema,
  resetPinSchema,
  adminProvisionSchema,
  vendorRegistrationSchema,
  vendorUpdateSchema,
  vendorStatusSchema,
  vendorFiltersSchema,
  vendorLoginSchema,
  validateRequest,
  validateQuery,
};
