'use strict';

const systemSettingsService = require('../services/system-settings.service');

const getSettings = async (req, res, next) => {
  try {
    const result = await systemSettingsService.getSettings();
    return res.status(200).json({
      success: true,
      data: result.settingsList
    });
  } catch (err) {
    next(err);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { settingKey, settingValue } = req.body;
    const updated = await systemSettingsService.updateSetting(settingKey, settingValue);
    return res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSetting
};
