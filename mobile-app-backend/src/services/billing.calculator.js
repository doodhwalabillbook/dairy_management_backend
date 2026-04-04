/**
 * Core dynamic calculator matching month ranges bridging standard customer limits and overlapping daily deliveries accurately natively.
 *
 * @param {Object} params 
 * @param {Object} params.customer
 * @param {number} params.month
 * @param {number} params.year 
 * @param {Array} params.deliveries
 * @param {Array} params.payments
 */
const calculateCustomerMonthlyTotals = ({ customer, month, year, deliveries = [], payments = [] }) => {
  // 1. Calendar Bound mapping constraints
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const today = new Date();
  
  // Extract Registration Date metrics securely
  const regDate = new Date(customer.registrationDate);
  const regYear = regDate.getUTCFullYear();
  const regMonth = regDate.getUTCMonth(); // 0-indexed internally

  // Target requested month is 0-indexed logically here
  const queryMonthIndex = month - 1;

  // Initialize outputs
  const ratePerLiter = parseFloat(customer.ratePerLiter.toString());
  
  // Out of Bounds check (Requested Month is completely before Registration Month)
  if (year < regYear || (year === regYear && queryMonthIndex < regMonth)) {
    return {
      customerId: customer.id,
      name: customer.name,
      address: customer.address,
      registrationDate: customer.registrationDate,
      ratePerLiter,
      totalDaysMilkTaken: 0,
      totalMilkDelivered: 0,
      totalAmount: 0,
      paymentPaid: 0, // Ignoring payments before registration
      remainingPayment: 0,
      paymentStatus: 'PAID', // Empty bill
      dailyList: [],
      dateRange: { startDate: null, endDate: null }
    };
  }

  // Calculate actual starting boundary
  let effectiveStartDate = startOfMonth;
  if (year === regYear && queryMonthIndex === regMonth) {
    // If querying the exact registration month, snap start date securely to the registration day
    effectiveStartDate = new Date(Date.UTC(regYear, regMonth, regDate.getUTCDate()));
  }

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
  
  // Clip bounds avoiding calculating defaults across upcoming future days blindly.
  const calendarEndDate = today < lastDayOfMonth ? 
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) : 
    lastDayOfMonth;

  let totalMilkDelivered = 0;
  let totalMorningMilk = 0;
  let totalEveningMilk = 0;
  let totalDaysMilkTaken = 0;
  const dailyList = [];
  
  // Calculate arrays precisely
  if (effectiveStartDate <= calendarEndDate) {
    const overridesMap = {};
    deliveries.forEach(ov => {
      const dateStr = ov.date.toISOString().split('T')[0];
      overridesMap[dateStr] = ov;
    });

    let currentLoopDate = new Date(effectiveStartDate);
    const defaultMorning = parseFloat(customer.morningQuantity.toString());
    const defaultEvening = parseFloat(customer.eveningQuantity.toString());

    while (currentLoopDate <= calendarEndDate) {
      const dateStr = currentLoopDate.toISOString().split('T')[0];
      
      let finalMorning = defaultMorning;
      let finalEvening = defaultEvening;
      let isEdited = false;

      if (overridesMap[dateStr]) {
        const ov = overridesMap[dateStr];
        finalMorning = parseFloat(ov.morningQuantity.toString());
        finalEvening = parseFloat(ov.eveningQuantity.toString());
        isEdited = true; // explicitly mutated by overriding row existence natively
      }

      const dailyTotal = finalMorning + finalEvening;
      totalMorningMilk += finalMorning;
      totalEveningMilk += finalEvening;
      totalMilkDelivered += dailyTotal;
      if (dailyTotal > 0) totalDaysMilkTaken++;

      dailyList.push({
        date: dateStr,
        morningQuantity: finalMorning,
        eveningQuantity: finalEvening,
        total: dailyTotal,
        isEdited,
      });

      currentLoopDate.setUTCDate(currentLoopDate.getUTCDate() + 1);
    }
  }

  // Multiply using baseline Customer constraints 
  const baseAmount = parseFloat((totalMilkDelivered * ratePerLiter).toFixed(2));
  
  const openingDue = parseFloat((customer.remainingAmount || 0).toString());
  const totalAmount = parseFloat((baseAmount + openingDue).toFixed(2));

  // Loop native Payment aggregation structurally mapping properly
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amountPaid.toString()), 0);
  
  const remainingPayment = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

  // Set logical Payment Status dynamically mapping explicit constraints accurately 
  let paymentStatus;
  if (totalPaid === 0 && totalAmount > 0)          paymentStatus = 'UNPAID';
  else if (totalPaid === 0 && totalAmount === 0)   paymentStatus = 'PAID'; // If 0 total and 0 paid, they are technically Paid up / clear.
  else if (remainingPayment <= 0)                  paymentStatus = 'PAID';
  else                                             paymentStatus = 'PARTIAL';

  return {
    customerId: customer.id,
    name: customer.name,
    address: customer.address,
    ratePerLiter,
    totalDaysMilkTaken,
    totalMorningMilk: parseFloat(totalMorningMilk.toFixed(2)),
    totalEveningMilk: parseFloat(totalEveningMilk.toFixed(2)),
    totalMilkDelivered: parseFloat(totalMilkDelivered.toFixed(2)),
    baseAmount,
    openingDue,
    totalAmount,
    paymentPaid: parseFloat(totalPaid.toFixed(2)),
    remainingPayment,
    paymentStatus,
    dailyList,
    dateRange: {
      startDate: effectiveStartDate <= calendarEndDate ? effectiveStartDate.toISOString().split('T')[0] : null,
      endDate: effectiveStartDate <= calendarEndDate ? calendarEndDate.toISOString().split('T')[0] : null
    }
  };
};

// ─── Single Day Calculation Logic ──────────────────────────────────────────────────

/**
 * Specifically computes Milk delivery values for a single Date dynamically handling default overrides and bandi restrictions cleanly natively.
 *
 * @param {Object} customer - The baseline Customer model.
 * @param {Object} overridesMap - Dictionary of pre-formatted `{ 'YYYY-MM-DD': overrideObject }`.
 * @param {string} targetDateStr - Target processing offset natively e.g., '2026-03-22'.
 */
const calculateDailyMilk = (customer, overridesMap, targetDateStr) => {
  const regDate = new Date(customer.registrationDate);
  
  // Registration boundary guard
  const regStr = regDate.toISOString().split('T')[0];
  if (targetDateStr < regStr) {
    return {
      customerId: customer.id,
      morningQuantity: 0,
      eveningQuantity: 0,
      total: 0,
      isEdited: false
    };
  }

  // Calculate logical delivery explicitly
  const defaultMorning = parseFloat(customer.morningQuantity.toString());
  const defaultEvening = parseFloat(customer.eveningQuantity.toString());

  let finalMorning = defaultMorning;
  let finalEvening = defaultEvening;
  let isEdited = false;

  if (overridesMap[targetDateStr]) {
    const ov = overridesMap[targetDateStr];
    finalMorning = parseFloat(ov.morningQuantity.toString());
    finalEvening = parseFloat(ov.eveningQuantity.toString());
    isEdited = true;
  }

  return {
    customerId: customer.id,
    morningQuantity: finalMorning,
    eveningQuantity: finalEvening,
    total: finalMorning + finalEvening,
    isEdited
  };
};

module.exports = {
  calculateCustomerMonthlyTotals,
  calculateDailyMilk,
};
