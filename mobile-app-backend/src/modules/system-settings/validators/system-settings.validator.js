'use strict';

const { z } = require('zod');

const updateSettingSchema = z.object({
  settingKey: z.string({
    required_error: 'settingKey is required'
  }).min(1, 'settingKey cannot be empty'),
  settingValue: z.string({
    required_error: 'settingValue is required'
  }).min(1, 'settingValue cannot be empty')
});

module.exports = {
  updateSettingSchema
};
