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

const getPlans = async (req, res, next) => {
  try {
    const plans = await subscriptionService.getAdminPlans();
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (err) {
    next(err);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionService.createSubscriptionPlan(req.body);
    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await subscriptionService.updateSubscriptionPlan(id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

const togglePlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const plan = await subscriptionService.updateSubscriptionPlan(id, { isActive });
    return res.status(200).json({
      success: true,
      message: `Subscription plan ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

const getSubscriptionHistory = async (req, res, next) => {
  try {
    const history = await subscriptionService.getGlobalHistory(req.query);
    return res.status(200).json({
      success: true,
      data: history.items,
      total: history.total,
      page: history.page,
      limit: history.limit
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
  getVendors,
  getPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  getSubscriptionHistory
};
