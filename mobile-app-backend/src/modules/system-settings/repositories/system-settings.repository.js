'use strict';

const prisma = require('../../../config/prisma');

const getAllSettings = async () => {
  return prisma.systemSetting.findMany();
};

const getSettingByKey = async (settingKey) => {
  return prisma.systemSetting.findUnique({
    where: { settingKey }
  });
};

const updateSetting = async (settingKey, settingValue) => {
  return prisma.systemSetting.update({
    where: { settingKey },
    data: { settingValue }
  });
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  updateSetting
};
