const billingService = require('../services/billing.service');

/**
 * GET /api/v1/billing
 * Returns month-wise / year-wise aggregated billing data.
 */
const getBilling = async (req, res, next) => {
  try {
    const { month, year, filterType, vendorId } = req.query;
    console.log(`[Billing] GET request by user=${req.user.id} month=${month} year=${year} filter=${filterType}`);

    const result = await billingService.getBilling({ month, year, filterType, vendorId });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/billing/payment
 * Record a customer payment and return an updated billing snapshot.
 */
const recordPayment = async (req, res, next) => {
  try {
    console.log(`[Billing] RECORD PAYMENT by user=${req.user.id} customerId=${req.body.customerId}`);
    const result = await billingService.recordPayment(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/billing/payment/:customerId
 * Fetch payment history for a customer, optionally filtered by month/year.
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    console.log(`[Billing] GET PAYMENT HISTORY customerId=${req.params.customerId} by user=${req.user.id}`);
    const result = await billingService.getPaymentHistory(req.params.customerId, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBilling, recordPayment, getPaymentHistory };
