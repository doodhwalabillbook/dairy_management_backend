'use strict';

const subscriptionStateService = require('../services/subscription-state.service');

const customerLimitMiddleware = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }

    // Reuse the state calculated in subscriptionStateMiddleware if present, otherwise fetch it
    const state = req.subscriptionState || await subscriptionStateService.getSubscriptionState(vendorId);

    if (state.subscriptionState === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired. Please renew your subscription.'
      });
    }

    if (!state.canAddCustomer) {
      return res.status(403).json({
        success: false,
        message: 'Customer limit reached. Please upgrade your subscription.'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = customerLimitMiddleware;
