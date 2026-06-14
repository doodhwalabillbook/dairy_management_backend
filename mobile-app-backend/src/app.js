const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');

// 1. Determine NODE_ENV first from the process environment (defaulting to 'local')
const nodeEnv = process.env.NODE_ENV || 'local';

// 2. Load the environment-specific file (e.g. .env.local or .env.development) with override: true
dotenv.config({ path: path.resolve(projectRoot, `.env.${nodeEnv}`), override: true });

// 3. Load the default .env file, but do NOT override already defined process environment variables
dotenv.config({ path: path.resolve(projectRoot, '.env'), override: false });
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
const vendorAuthRoutes = require('./modules/vendor-auth/vendor-auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const milkDeliveryRoutes = require('./modules/milk-delivery/milk-delivery.routes');
const companyRoutes = require('./routes/company.routes');
const customerRoutes = require('./routes/customer.routes');
const billingRoutes = require('./routes/billing.routes');
const authMiddleware = require('./middleware/auth.middleware');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vendor', vendorAuthRoutes);
app.use('/api/v1/vendor/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/v1/vendor/milk-delivery', milkDeliveryRoutes);
app.use('/api/v1/vendor/extra-products', require('./modules/extra-products/extra-product.routes'));
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/billing', billingRoutes);

// Subscription and Settings Routes
app.use('/api/subscriptions', require('./modules/subscription/routes/vendor-subscription.routes'));
app.use('/api/admin/subscriptions', require('./modules/subscription/routes/admin-subscription.routes'));
app.use('/api/admin', require('./modules/system-settings/routes/system-settings.routes'));

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
