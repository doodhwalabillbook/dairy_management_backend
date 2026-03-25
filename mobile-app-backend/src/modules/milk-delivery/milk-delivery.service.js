const milkDeliveryRepo = require('./milk-delivery.repository');
const customerRepo = require('../../repositories/customer.repository');
const prisma = require('../../config/prisma');
const { calculateCustomerMonthlyTotals } = require('../../services/billing.calculator');

/**
 * Get the monthly milk delivery array tracking the full calendar of values accurately calculating summaries properly mapped dynamically via shared calculator.
 * @param {string} customerId
 * @param {number} queryMonth (1-12)
 * @param {number} queryYear
 * @param {string} vendorId (guarding verification)
 */
const getMonthlyBadiList = async (customerId, queryMonth, queryYear, vendorId) => {
  // 1. Fetch Customer exactly protecting vendorId
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  if (customer.vendorId !== vendorId) {
    const error = new Error('Unauthorized. Customer does not belong to vendor');
    error.statusCode = 403;
    throw error;
  }

  // 2. Fetch dependencies
  const [deliveries, payments] = await Promise.all([
    prisma.milkDelivery.findMany({
      where: {
        customerId,
        date: {
          gte: new Date(Date.UTC(queryYear, queryMonth - 1, 1)),
          lte: new Date(Date.UTC(queryYear, queryMonth, 0)),
        }
      }
    }),
    prisma.payment.findMany({
      where: { customerId, month: queryMonth, year: queryYear }
    })
  ]);

  // 3. Delegate to central calculator natively generating boundaries securely mimicking everything explicitly natively.
  const calc = calculateCustomerMonthlyTotals({
    customer,
    month: queryMonth,
    year: queryYear,
    deliveries,
    payments
  });

  return {
    customer: {
      customerId: customer.id,
      name: customer.name,
      registrationDate: customer.registrationDate.toISOString().split('T')[0],
      ratePerLiter: calc.ratePerLiter,
    },
    month: queryMonth,
    year: queryYear,
    dateRange: calc.dateRange,
    summary: {
      totalMilkDelivered: calc.totalMilkDelivered,
      totalAmount: calc.totalAmount,
      totalPaid: calc.paymentPaid,
      remainingAmount: calc.remainingPayment,
    },
    dailyList: calc.dailyList,
  };
};

/**
 * Handle mutative overwriting uniquely guarding arrays directly bound natively.
 * @param {Object} payload 
 * @param {string} vendorId
 */
const updateDailyEntry = async (payload, vendorId) => {
  // Validate customer securely
  const customer = await customerRepo.findCustomerById(payload.customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  if (customer.vendorId !== vendorId) {
    const error = new Error('Unauthorized. Customer does not belong to vendor');
    error.statusCode = 403;
    throw error;
  }

  // UPSERT
  const dateObj = new Date(`${payload.date}T00:00:00.000Z`); // Guarantee UTC
  await milkDeliveryRepo.upsertDailyEntry({
    customerId: payload.customerId,
    vendorId,
    date: dateObj,
    morningQuantity: payload.morningQuantity,
    eveningQuantity: payload.eveningQuantity,
    updatedBy: vendorId,
    createdBy: vendorId
  });

  return { success: true, message: 'Daily entry updated successfully.' };
};

const _buildEmptyResponse = (customer, month, year) => {
  return {
    customer: {
      customerId: customer.id,
      name: customer.name,
      ratePerLiter: parseFloat(customer.ratePerLiter.toString()),
    },
    month,
    year,
    summary: {
      totalMilkDelivered: 0,
      totalAmount: 0,
      totalPaid: 0,
      remainingAmount: 0,
    },
    dailyList: [],
  };
};

module.exports = {
  getMonthlyBadiList,
  updateDailyEntry,
};
