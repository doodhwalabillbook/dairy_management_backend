const dashboardService = require('./dashboard.service');

/**
 * Handle Dashboard payload parsing effectively generating Today and Monthly overlaps.
 */
const getDashboardData = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId;
    if (!vendorId) {
      return res.status(403).json({ success: false, message: 'Only vendors can access dashboard dynamically.' });
    }

    const { date, month, year } = req.query;

    const data = await dashboardService.getVendorDashboardData({
      vendorId,
      reqDate: date,
      reqMonth: month,
      reqYear: year
    });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardData };
