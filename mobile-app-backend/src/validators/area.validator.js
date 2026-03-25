const { z } = require('zod');

const createAreaSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

const updateAreaSchema = createAreaSchema.partial();

const areaFiltersSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
  size: z.string().regex(/^\d+$/).transform(Number).optional().default("10"),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
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

module.exports = {
  createAreaSchema,
  updateAreaSchema,
  areaFiltersSchema,
  validateRequest,
  validateQuery
};
