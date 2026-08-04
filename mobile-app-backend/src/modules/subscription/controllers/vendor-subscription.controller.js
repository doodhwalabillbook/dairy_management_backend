'use strict';

const subscriptionService = require('../services/subscription.service');

const getPlans = async (req, res, next) => {
  try {
    const plans = await subscriptionService.getPlans();
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (err) {
    next(err);
  }
};

const getCurrentSubscription = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const current = await subscriptionService.getCurrentSubscription(vendorId);
    return res.status(200).json({
      success: true,
      data: current
    });
  } catch (err) {
    next(err);
  }
};

const getSubscriptionStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const status = await subscriptionService.getSubscriptionStatus(vendorId);
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
};

const getSubscriptionHistory = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const history = await subscriptionService.getSubscriptionHistory(vendorId);
    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
};

const getRequestHistory = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const history = await subscriptionService.getRequestHistory(vendorId);
    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
};

const createRequest = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const { planId, paymentMode, remarks } = req.body;
    const request = await subscriptionService.createSubscriptionRequest(vendorId, planId, paymentMode, remarks);
    return res.status(201).json({
      success: true,
      message: 'Subscription request submitted successfully',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

const renewRequest = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor context'
      });
    }
    const { paymentMode, remarks } = req.body;
    const request = await subscriptionService.createSubscriptionRenewal(vendorId, paymentMode, remarks);
    return res.status(201).json({
      success: true,
      message: 'Renewal request submitted successfully',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionStatus,
  getSubscriptionHistory,
  getRequestHistory,
  createRequest,
  renewRequest
};
