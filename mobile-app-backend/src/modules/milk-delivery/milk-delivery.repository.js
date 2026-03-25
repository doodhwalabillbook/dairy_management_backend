const prisma = require('../../config/prisma');

/**
 * Fetch all MilkDelivery override entries for a customer within a specific date range.
 * @param {string} customerId
 * @param {Date} startDate
 * @param {Date} endDate
 */
const getOverridesByDateRange = async (customerId, startDate, endDate) => {
  return prisma.milkDelivery.findMany({
    where: {
      customerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
};

/**
 * Sweeps or newly inserts a MilkDelivery row safely binding on customerId+date unique keys dynamically replacing standard constraints permanently.
 * @param {Object} data - Contains customerId, vendorId, date, morningQuantity, eveningQuantity, isEdited, updatedBy
 */
const upsertDailyEntry = async (data) => {
  return prisma.milkDelivery.upsert({
    where: {
      customerId_date: {
        customerId: data.customerId,
        date: data.date,
      },
    },
    update: {
      morningQuantity: data.morningQuantity,
      eveningQuantity: data.eveningQuantity,
      isEdited: true,
      updatedBy: data.updatedBy,
    },
    create: {
      customerId: data.customerId,
      vendorId: data.vendorId,
      date: data.date,
      morningQuantity: data.morningQuantity,
      eveningQuantity: data.eveningQuantity,
      isEdited: true,
      createdBy: data.createdBy || data.updatedBy,
      updatedBy: data.updatedBy,
    },
  });
};

module.exports = {
  getOverridesByDateRange,
  upsertDailyEntry,
};
