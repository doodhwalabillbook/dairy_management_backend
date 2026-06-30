'use strict';

const subscriptionStateService = require('../services/subscription-state.service');

const subscriptionStateMiddleware = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'ADMIN') {
      return next();
    }
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }

    const state = await subscriptionStateService.getSubscriptionState(vendorId);

    if (state.subscriptionState === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired. Please renew your subscription.'
      });
    }

    // Attach subscription state to the request object so subsequent handlers or middlewares can reuse it
    req.subscriptionState = state;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = subscriptionStateMiddleware;
