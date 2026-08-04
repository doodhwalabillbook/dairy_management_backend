'use strict';

const prisma = require('../../../config/prisma');

const getAdminDashboardData = async () => {
  const [
    totalCompanies,
    totalVendors,
    totalCustomers,
    pendingRequests,
    activeSubscriptions,
    planDistribution,
    financials
  ] = await Promise.all([
    // Total companies
    prisma.company.count({ where: { isActive: true } }),
    // Total vendors
    prisma.vendor.count(),
    // Total customers
    prisma.customer.count({ where: { isActive: true } }),
    // Pending requests
    prisma.subscriptionRequest.count({ where: { requestStatus: 'PENDING' } }),
    // All vendor subscriptions to calculate status tallies
    prisma.vendorSubscription.findMany({
      include: { plan: true }
    }),
    // Count of plans distribution
    prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: { where: { status: 'ACTIVE' } } }
        }
      }
    }),
    // Total revenue from approved subscription requests
    prisma.subscriptionRequest.aggregate({
      where: { requestStatus: 'APPROVED' },
      _sum: { requestedAmount: true }
    })
  ]);

  // Dynamically calculate the state tallies
  let activeCount = 0;
  let expiringSoonCount = 0;
  let gracePeriodCount = 0;
  let expiredCount = 0;

  // Load grace period and warning settings dynamically
  const graceSetting = await prisma.systemSetting.findUnique({ where: { settingKey: 'SUBSCRIPTION_GRACE_PERIOD_DAYS' } });
  const warningSetting = await prisma.systemSetting.findUnique({ where: { settingKey: 'SUBSCRIPTION_WARNING_DAYS' } });
  const gracePeriodDays = parseInt(graceSetting?.settingValue || '7', 10);
  const warningDays = parseInt(warningSetting?.settingValue || '5', 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const sub of activeSubscriptions) {
    if (sub.status !== 'ACTIVE') {
      expiredCount++;
      continue;
    }
    const expiryDate = new Date(sub.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);

    const msInADay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.ceil((expiryDate - today) / msInADay);

    const graceExpiryDate = new Date(expiryDate);
    graceExpiryDate.setDate(graceExpiryDate.getDate() + gracePeriodDays);

    if (today <= expiryDate) {
      if (daysDiff <= warningDays) {
        expiringSoonCount++;
      } else {
        activeCount++;
      }
    } else if (today <= graceExpiryDate) {
      gracePeriodCount++;
    } else {
      expiredCount++;
    }
  }

  // Map plans distribution for active subscriptions
  const planDistributionMapped = planDistribution.map(p => ({
    planCode: p.planCode,
    planName: p.planName,
    count: p._count.subscriptions
  }));

  return {
    counters: {
      totalCompanies,
      totalVendors,
      totalCustomers,
      pendingSubscriptionRequests: pendingRequests
    },
    subscriptions: {
      active: activeCount,
      expiringSoon: expiringSoonCount,
      gracePeriod: gracePeriodCount,
      expired: expiredCount
    },
    planDistribution: planDistributionMapped,
    financials: {
      totalRevenue: Number(financials._sum.requestedAmount || 0),
      currency: 'INR'
    }
  };
};

module.exports = {
  getAdminDashboardData
};
