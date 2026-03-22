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

const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Validation failed', errors: err.errors });
  }
};

module.exports = { loginSchema, resetPinSchema, adminProvisionSchema, validateRequest };
