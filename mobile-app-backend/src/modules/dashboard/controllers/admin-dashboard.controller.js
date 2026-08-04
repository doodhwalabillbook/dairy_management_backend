'use strict';

const dashboardService = require('../services/admin-dashboard.service');

const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboardData();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard
};
