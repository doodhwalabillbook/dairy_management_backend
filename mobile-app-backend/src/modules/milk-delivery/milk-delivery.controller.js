const milkDeliveryService = require('./milk-delivery.service');

const getMonthlyBadiList = async (req, res, next) => {
  try {
    const { customerId, month, year } = req.query;
    const vendorId = req.user.vendorId; // Extract from JWT auth middleware

    const result = await milkDeliveryService.getMonthlyBadiList(
      customerId, 
      parseInt(month, 10), 
      parseInt(year, 10), 
      vendorId
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const updateDailyEntry = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const result = await milkDeliveryService.updateDailyEntry(req.body, vendorId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMonthlyBadiList,
  updateDailyEntry,
};
