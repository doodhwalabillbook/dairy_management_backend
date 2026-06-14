'use strict';

const systemSettingsRepo = require('../repositories/system-settings.repository');

const getSettings = async () => {
  const settings = await systemSettingsRepo.getAllSettings();
  const settingsMap = {};
  settings.forEach(s => {
    settingsMap[s.settingKey] = s.settingValue;
  });
  return {
    settingsList: settings,
    settingsMap
  };
};

const getSettingValue = async (key, defaultValue) => {
  const setting = await systemSettingsRepo.getSettingByKey(key);
  return setting ? setting.settingValue : defaultValue;
};

const updateSetting = async (key, value) => {
  const existing = await systemSettingsRepo.getSettingByKey(key);
  if (!existing) {
    const error = new Error(`Setting with key '${key}' not found`);
    error.statusCode = 404;
    throw error;
  }
  return systemSettingsRepo.updateSetting(key, String(value));
};

module.exports = {
  getSettings,
  getSettingValue,
  updateSetting
};
