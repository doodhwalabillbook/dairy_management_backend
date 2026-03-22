require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('API Running 🚀');
});

const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const companyRoutes = require('./routes/company.routes');
const customerRoutes = require('./routes/customer.routes');
const billingRoutes = require('./routes/billing.routes');
const authMiddleware = require('./middleware/auth.middleware');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/billing', billingRoutes);

app.get('/api/v1/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors
  });
});

module.exports = app;
