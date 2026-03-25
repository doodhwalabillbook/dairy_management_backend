const prisma = require('../../config/prisma');
const { calculateCustomerMonthlyTotals, calculateDailyMilk } = require('../../services/billing.calculator');

/**
 * Fetch Vendor Dashboard dynamically structuring Today explicitly mapping Monthly summaries.
 */
const getVendorDashboardData = async ({ vendorId, reqDate, reqMonth, reqYear }) => {
  const today = new Date();
  
  // Default values correctly mapping optional queries
  const targetDateStr = reqDate || today.toISOString().split('T')[0];
  
  let targetMonth = reqMonth ? parseInt(reqMonth, 10) : today.getUTCMonth() + 1;
  let targetYear = reqYear ? parseInt(reqYear, 10) : today.getUTCFullYear();

  // If a specific date is given, force the monthly summary to map that date's specific month/year?
  // User Prompt: "If date is provided, TODAY SUMMARY should be calculated for that specific date. MONTHLY SUMMARY: Use shared function"
  // It implies the monthly summary belongs to reqMonth/reqYear if provided, otherwise defaults current.

  // 1. Fetch Vendor's active customers safely
  const rawCustomers = await prisma.customer.findMany({
    where: { vendorId, isActive: true },
  });

  if (rawCustomers.length === 0) {
    return _buildEmptyDashboard(targetDateStr, targetMonth, targetYear);
  }
  const customerIds = rawCustomers.map(c => c.id);

  // 2. Fetch dependencies bulk explicitly matching targetMonth + targetYear limits
  const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0));

  const [deliveries, payments] = await Promise.all([
    prisma.milkDelivery.findMany({
      where: {
        customerId: { in: customerIds },
        date: { gte: startOfMonth, lte: lastDayOfMonth }
      }
    }),
    prisma.payment.findMany({
      where: {
        customerId: { in: customerIds },
        month: targetMonth,
        year: targetYear
      }
    })
  ]);

  // Map into hash maps minimizing O(N) overlaps cleanly
  const deliveryMap = {};
  const paymentMap = {};
  customerIds.forEach(id => {
    deliveryMap[id] = [];
    paymentMap[id] = [];
  });
  
  deliveries.forEach(d => deliveryMap[d.customerId].push(d));
  payments.forEach(p => paymentMap[p.customerId].push(p));

  // Initialize summary aggregation containers explicitly natively 
  let todayTotalMorning = 0;
  let todayTotalEvening = 0;
  let todayTotalMilk = 0;
  let todayTotalEarning = 0;
  let todayCustomersServed = 0;

  let monthlyTotalMorning = 0;
  let monthlyTotalEvening = 0;
  let monthlyTotalMilk = 0;
  let monthlyTotalEarning = 0;
  let monthlyTotalPaid = 0;
  let monthlyRemaining = 0;

  // Process iterations sequentially securely generating both metrics cleanly over memory objects reliably!
  rawCustomers.forEach(customer => {
    // --- MONTHLY COMPUTATION ---
    const monthlyCalc = calculateCustomerMonthlyTotals({
      customer,
      month: targetMonth,
      year: targetYear,
      deliveries: deliveryMap[customer.id],
      payments: paymentMap[customer.id]
    });

    monthlyTotalMorning += monthlyCalc.totalMorningMilk;
    monthlyTotalEvening += monthlyCalc.totalEveningMilk;
    monthlyTotalMilk += monthlyCalc.totalMilkDelivered;
    monthlyTotalEarning += monthlyCalc.totalAmount;
    monthlyTotalPaid += monthlyCalc.paymentPaid;
    monthlyRemaining += monthlyCalc.remainingPayment;

    // --- TODAY / CUSTOM DATE COMPUTATION ---
    // Extract overrides dictionary for calculateDailyMilk fast mapping
    const overridesHash = {};
    deliveryMap[customer.id].forEach(ov => {
      const dStr = ov.date.toISOString().split('T')[0];
      overridesHash[dStr] = ov;
    });

    const dailyCalc = calculateDailyMilk(customer, overridesHash, targetDateStr);
    
    if (dailyCalc.total > 0) {
      todayCustomersServed++;
      todayTotalMorning += dailyCalc.morningQuantity;
      todayTotalEvening += dailyCalc.eveningQuantity;
      todayTotalMilk += dailyCalc.total;
      todayTotalEarning += dailyCalc.total * parseFloat(customer.ratePerLiter.toString());
    }
  });

  return {
    todaySummary: {
      date: targetDateStr,
      totalMorningMilkDelivered: parseFloat(todayTotalMorning.toFixed(2)),
      totalEveningMilkDelivered: parseFloat(todayTotalEvening.toFixed(2)),
      totalMilkDelivered: parseFloat(todayTotalMilk.toFixed(2)),
      totalCustomersServed: todayCustomersServed,
      totalEarning: parseFloat(todayTotalEarning.toFixed(2)),
    },
    monthlySummary: {
      month: targetMonth,
      year: targetYear,
      totalMorningMilkDelivered: parseFloat(monthlyTotalMorning.toFixed(2)),
      totalEveningMilkDelivered: parseFloat(monthlyTotalEvening.toFixed(2)),
      totalMilkDelivered: parseFloat(monthlyTotalMilk.toFixed(2)),
      totalEarning: parseFloat(monthlyTotalEarning.toFixed(2)),
      totalPaymentReceived: parseFloat(monthlyTotalPaid.toFixed(2)),
      totalPendingAmount: parseFloat(monthlyRemaining.toFixed(2)),
    }
  };
};

const _buildEmptyDashboard = (targetDateStr, targetMonth, targetYear) => ({
  todaySummary: {
    date: targetDateStr,
    totalMorningMilkDelivered: 0,
    totalEveningMilkDelivered: 0,
    totalMilkDelivered: 0,
    totalCustomersServed: 0,
    totalEarning: 0,
  },
  monthlySummary: {
    month: targetMonth,
    year: targetYear,
    totalMorningMilkDelivered: 0,
    totalEveningMilkDelivered: 0,
    totalMilkDelivered: 0,
    totalEarning: 0,
    totalPaymentReceived: 0,
    totalPendingAmount: 0,
  }
});

module.exports = { getVendorDashboardData };
