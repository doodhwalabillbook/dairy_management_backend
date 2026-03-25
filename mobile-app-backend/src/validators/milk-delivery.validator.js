const { z } = require('zod');

const getMonthlyListSchema = z.object({
  customerId: z.string().uuid(),
  month: z.string().regex(/^(1[0-2]|[1-9])$/, 'Month must be between 1 and 12'),
  year: z.string().length(4).regex(/^\d+$/, 'Year must be a valid 4-digit number'),
});

const updateDailyEntrySchema = z.object({
  customerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  morningQuantity: z.number().min(0, 'Morning quantity cannot be negative'),
  eveningQuantity: z.number().min(0, 'Evening quantity cannot be negative'),
});

const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Query validation failed', errors: err.errors });
  }
};

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Body validation failed', errors: err.errors });
  }
};

module.exports = {
  getMonthlyListSchema,
  updateDailyEntrySchema,
  validateQuery,
  validateBody,
};
