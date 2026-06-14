'use strict';

const prisma = require('../../../config/prisma');
const systemSettingsService = require('../../system-settings/services/system-settings.service');

/**
 * Normalizes a date to start of the day (midnight) for accurate day-based calculations.
 */
const normalizeToMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Calculates the dynamically computed state of a vendor's subscription.
 * @param {string} vendorId 
 */
const getSubscriptionState = async (vendorId) => {
  // 1. Fetch active subscription for the vendor
  const subscription = await prisma.vendorSubscription.findFirst({
    where: {
      vendorId,
      status: 'ACTIVE'
    },
    include: {
      plan: true
    }
  });

  // Load grace period and warning settings dynamically
  const gracePeriodDaysStr = await systemSettingsService.getSettingValue('SUBSCRIPTION_GRACE_PERIOD_DAYS', '7');
  const warningDaysStr = await systemSettingsService.getSettingValue('SUBSCRIPTION_WARNING_DAYS', '5');

  const gracePeriodDays = parseInt(gracePeriodDaysStr, 10);
  const warningDays = parseInt(warningDaysStr, 10);

  // If no subscription is found, default to EXPIRED state
  if (!subscription) {
    return {
      planName: 'NONE',
      planPrice: 0,
      customerLimit: 0,
      customerUsed: 0,
      customerRemaining: 0,
      startDate: null,
      expiryDate: null,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      subscriptionState: 'EXPIRED',
      renewalRequired: true,
      warningRequired: false,
      canAddCustomer: false,
      canEditCustomer: false,
      displayMessage: 'No active subscription found. Please purchase a subscription.'
    };
  }

  const today = normalizeToMidnight(new Date());
  const expiryDate = normalizeToMidnight(subscription.expiryDate);
  const startDate = normalizeToMidnight(subscription.startDate);

  // Calculate days remaining (or days overdue)
  const msInADay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.ceil((expiryDate - today) / msInADay);
  const daysRemaining = Math.max(0, daysDiff);

  const graceExpiryDate = new Date(expiryDate);
  graceExpiryDate.setDate(graceExpiryDate.getDate() + gracePeriodDays);
  const graceDaysDiff = Math.ceil((graceExpiryDate - today) / msInADay);
  const graceDaysRemaining = Math.max(0, graceDaysDiff);

  // Count active customers used by the vendor
  const customerUsed = await prisma.customer.count({
    where: {
      vendorId,
      isActive: true
    }
  });

  const customerLimit = subscription.plan.customerLimit;
  const customerRemaining = customerLimit === null ? null : Math.max(0, customerLimit - customerUsed);

  // Determine State
  let state = 'ACTIVE';
  let displayMessage = 'Your subscription is active.';
  let renewalRequired = false;
  let warningRequired = false;

  if (today <= expiryDate) {
    if (daysRemaining <= warningDays) {
      state = 'EXPIRING_SOON';
      displayMessage = `Your subscription will expire in ${daysRemaining} days. Please renew soon.`;
      renewalRequired = true;
      warningRequired = true;
    }
  } else if (today <= graceExpiryDate) {
    state = 'GRACE_PERIOD';
    displayMessage = `Your subscription has expired. You have ${graceDaysRemaining} grace days remaining.`;
    renewalRequired = true;
  } else {
    state = 'EXPIRED';
    displayMessage = 'Your subscription has expired. Please renew your subscription.';
    renewalRequired = true;
  }

  // Calculate permissions
  const isExpired = state === 'EXPIRED';
  const hasCapacity = customerLimit === null || customerUsed < customerLimit;

  const canAddCustomer = !isExpired && hasCapacity;
  const canEditCustomer = !isExpired; // Grace period allows edits, EXPIRED blocks edits

  return {
    planName: subscription.plan.planName,
    planPrice: Number(subscription.plan.price),
    customerLimit,
    customerUsed,
    customerRemaining,
    startDate: subscription.startDate.toISOString().split('T')[0],
    expiryDate: subscription.expiryDate.toISOString().split('T')[0],
    daysRemaining,
    graceDaysRemaining,
    subscriptionState: state,
    renewalRequired,
    warningRequired,
    canAddCustomer,
    canEditCustomer,
    displayMessage
  };
};

module.exports = {
  getSubscriptionState
};
