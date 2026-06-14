'use strict';

const subscriptionService = require('../services/subscription.service');

const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await subscriptionService.getPendingRequests();
    return res.status(200).json({
      success: true,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await subscriptionService.getRequestById(id);
    return res.status(200).json({
      success: true,
      data: request
    });
  } catch (err) {
    next(err);
  }
};

const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId || req.user.id;
    const activated = await subscriptionService.approveSubscriptionRequest(id, adminUserId);
    return res.status(200).json({
      success: true,
      message: 'Subscription request approved successfully',
      data: activated
    });
  } catch (err) {
    next(err);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const adminUserId = req.user.userId || req.user.id;
    const rejected = await subscriptionService.rejectSubscriptionRequest(id, adminUserId, remarks);
    return res.status(200).json({
      success: true,
      message: 'Subscription request rejected successfully',
      data: rejected
    });
  } catch (err) {
    next(err);
  }
};

const getVendors = async (req, res, next) => {
  try {
    const subscriptions = await subscriptionService.getAllVendorSubscriptions();
    return res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  getVendors
};
