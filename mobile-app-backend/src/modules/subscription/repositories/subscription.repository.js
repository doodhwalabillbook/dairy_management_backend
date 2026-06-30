'use strict';

const prisma = require('../../../config/prisma');

const getPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' }
  });
};

const getPlanById = async (planId) => {
  return prisma.subscriptionPlan.findUnique({
    where: { id: planId }
  });
};

const getCurrentSubscription = async (vendorId) => {
  return prisma.vendorSubscription.findFirst({
    where: { vendorId, status: 'ACTIVE' },
    include: { plan: true }
  });
};

const getSubscriptionHistory = async (vendorId) => {
  return prisma.subscriptionHistory.findMany({
    where: { vendorId },
    include: {
      oldPlan: true,
      newPlan: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const getRequestHistory = async (vendorId) => {
  return prisma.subscriptionRequest.findMany({
    where: { vendorId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  });
};

const createSubscriptionRequest = async (data) => {
  return prisma.subscriptionRequest.create({
    data: {
      vendorId: data.vendorId,
      planId: data.planId,
      requestedAmount: data.requestedAmount,
      paymentMode: data.paymentMode,
      requestStatus: 'PENDING',
      remarks: data.remarks
    }
  });
};

const getPendingRequests = async () => {
  return prisma.subscriptionRequest.findMany({
    include: {
      vendor: true,
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const getRequestById = async (id) => {
  return prisma.subscriptionRequest.findUnique({
    where: { id },
    include: {
      vendor: true,
      plan: true
    }
  });
};

const getAllVendorSubscriptions = async () => {
  return prisma.vendorSubscription.findMany({
    include: {
      vendor: true,
      plan: true
    },
    orderBy: { expiryDate: 'asc' }
  });
};

const getAdminPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    orderBy: { price: 'asc' }
  });
};

const getPlanByCode = async (planCode) => {
  return prisma.subscriptionPlan.findUnique({
    where: { planCode }
  });
};

const createPlan = async (data) => {
  return prisma.subscriptionPlan.create({
    data: {
      planCode: data.planCode,
      planName: data.planName,
      description: data.description,
      price: data.price,
      customerLimit: data.customerLimit,
      durationDays: data.durationDays,
      isActive: true
    }
  });
};

const updatePlan = async (id, data) => {
  return prisma.subscriptionPlan.update({
    where: { id },
    data
  });
};

const getGlobalHistory = async ({ page = 1, limit = 20, search = '' }) => {
  const skip = (page - 1) * limit;
  const where = search ? {
    OR: [
      { vendor: { name: { contains: search } } },
      { newPlan: { planName: { contains: search } } },
      { action: { contains: search } }
    ]
  } : {};

  const [total, items] = await Promise.all([
    prisma.subscriptionHistory.count({ where }),
    prisma.subscriptionHistory.findMany({
      where,
      skip,
      take: limit,
      include: {
        vendor: true,
        oldPlan: true,
        newPlan: true
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return { total, page, limit, items };
};

module.exports = {
  getPlans,
  getPlanById,
  getCurrentSubscription,
  getSubscriptionHistory,
  getRequestHistory,
  createSubscriptionRequest,
  getPendingRequests,
  getRequestById,
  getAllVendorSubscriptions,
  getAdminPlans,
  getPlanByCode,
  createPlan,
  updatePlan,
  getGlobalHistory
};
