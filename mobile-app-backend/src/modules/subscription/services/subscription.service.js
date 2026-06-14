'use strict';

const prisma = require('../../../config/prisma');
const subscriptionRepo = require('../repositories/subscription.repository');
const subscriptionStateService = require('./subscription-state.service');

const getPlans = async () => {
  return subscriptionRepo.getPlans();
};

const getCurrentSubscription = async (vendorId) => {
  return subscriptionRepo.getCurrentSubscription(vendorId);
};

const getSubscriptionStatus = async (vendorId) => {
  return subscriptionStateService.getSubscriptionState(vendorId);
};

const getSubscriptionHistory = async (vendorId) => {
  return subscriptionRepo.getSubscriptionHistory(vendorId);
};

const getRequestHistory = async (vendorId) => {
  return subscriptionRepo.getRequestHistory(vendorId);
};

const createSubscriptionRequest = async (vendorId, planId, paymentMode, remarks = '') => {
  const plan = await subscriptionRepo.getPlanById(planId);
  if (!plan || !plan.isActive) {
    const error = new Error('Subscription plan not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  // Check if there is already a PENDING request for this vendor to prevent spamming
  const pendingRequest = await prisma.subscriptionRequest.findFirst({
    where: {
      vendorId,
      planId,
      requestStatus: 'PENDING'
    }
  });

  if (pendingRequest) {
    const error = new Error('You already have a pending upgrade request for this plan');
    error.statusCode = 400;
    throw error;
  }

  return subscriptionRepo.createSubscriptionRequest({
    vendorId,
    planId,
    requestedAmount: plan.price,
    paymentMode,
    remarks
  });
};

const createSubscriptionRenewal = async (vendorId, paymentMode, remarks = '') => {
  const currentSub = await subscriptionRepo.getCurrentSubscription(vendorId);
  if (!currentSub) {
    const error = new Error('No active subscription found to renew');
    error.statusCode = 400;
    throw error;
  }

  // Check if there is already a PENDING request for this vendor to prevent duplicate renewals
  const pendingRenewal = await prisma.subscriptionRequest.findFirst({
    where: {
      vendorId,
      planId: currentSub.planId,
      requestStatus: 'PENDING'
    }
  });

  if (pendingRenewal) {
    const error = new Error('You already have a pending renewal request for this plan');
    error.statusCode = 400;
    throw error;
  }

  return subscriptionRepo.createSubscriptionRequest({
    vendorId,
    planId: currentSub.planId,
    requestedAmount: currentSub.plan.price,
    paymentMode,
    remarks: remarks || `Renewal for plan ${currentSub.plan.planName}`
  });
};

// Admin Services
const getPendingRequests = async () => {
  return subscriptionRepo.getPendingRequests();
};

const getRequestById = async (id) => {
  const request = await subscriptionRepo.getRequestById(id);
  if (!request) {
    const error = new Error('Subscription request not found');
    error.statusCode = 404;
    throw error;
  }
  return request;
};

/**
 * Approves a subscription request. Runs in a transaction.
 */
const approveSubscriptionRequest = async (requestId, adminUserId) => {
  return prisma.$transaction(async (tx) => {
    // 1. Validate request exists and is PENDING
    const request = await tx.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: { plan: true }
    });

    if (!request) {
      throw new Error('Subscription request not found');
    }

    if (request.requestStatus !== 'PENDING') {
      throw new Error('Subscription request is not pending');
    }

    // 2. Fetch existing active subscription for the vendor
    const activeSub = await tx.vendorSubscription.findFirst({
      where: {
        vendorId: request.vendorId,
        status: 'ACTIVE'
      }
    });

    const isRenewal = activeSub && activeSub.planId === request.planId;
    const now = new Date();

    let startDate = new Date();
    let expiryDate = new Date();

    if (isRenewal) {
      const activeExpiry = new Date(activeSub.expiryDate);
      if (activeExpiry > now) {
        // If current subscription is still active, extend it by 30 days from its expiry date
        startDate = activeExpiry;
        expiryDate = new Date(activeExpiry);
        expiryDate.setDate(expiryDate.getDate() + (request.plan.durationDays || 30));
      } else {
        // If already expired, start today
        expiryDate.setDate(now.getDate() + (request.plan.durationDays || 30));
      }
    } else {
      // For upgrades, new plan starts today and lasts 30 days
      expiryDate.setDate(now.getDate() + (request.plan.durationDays || 30));
    }

    // 3. Expire the existing active subscription
    if (activeSub) {
      await tx.vendorSubscription.update({
        where: { id: activeSub.id },
        data: { status: 'EXPIRED' }
      });
    }

    // 4. Create new active subscription
    const newSubscription = await tx.vendorSubscription.create({
      data: {
        vendorId: request.vendorId,
        planId: request.planId,
        status: 'ACTIVE',
        startDate,
        expiryDate
      },
      include: { plan: true }
    });

    // 5. Update request status to APPROVED
    await tx.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        requestStatus: 'APPROVED',
        approvedAt: now,
        approvedBy: adminUserId,
        remarks: request.remarks ? `${request.remarks} | Approved by Admin` : 'Approved by Admin'
      }
    });

    // 6. Log history
    await tx.subscriptionHistory.create({
      data: {
        vendorId: request.vendorId,
        oldPlanId: activeSub ? activeSub.planId : null,
        newPlanId: request.planId,
        action: isRenewal ? 'RENEW' : 'UPGRADE',
        performedBy: adminUserId
      }
    });

    console.log(`[AUDIT] Subscription Request ${requestId} approved by Admin ${adminUserId}. New plan: ${request.plan.planName}`);

    return newSubscription;
  });
};

const rejectSubscriptionRequest = async (requestId, adminUserId, remarks = '') => {
  const request = await prisma.subscriptionRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    const error = new Error('Subscription request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.requestStatus !== 'PENDING') {
    const error = new Error('Subscription request is not pending');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.subscriptionRequest.update({
    where: { id: requestId },
    data: {
      requestStatus: 'REJECTED',
      remarks: remarks || 'Rejected by Admin'
    }
  });

  console.log(`[AUDIT] Subscription Request ${requestId} rejected by Admin ${adminUserId}.`);

  return updated;
};

const getAllVendorSubscriptions = async () => {
  return subscriptionRepo.getAllVendorSubscriptions();
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionStatus,
  getSubscriptionHistory,
  getRequestHistory,
  createSubscriptionRequest,
  createSubscriptionRenewal,
  getPendingRequests,
  getRequestById,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getAllVendorSubscriptions
};
