'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/system-settings.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const adminRoleMiddleware = require('../../subscription/middlewares/admin-role.middleware');
const { updateSettingSchema } = require('../validators/system-settings.validator');

const validateRequest = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }
};

// Mount endpoints under '/settings' (which will be prefix-mounted at '/api/admin/settings' in app.js or '/api/admin')
router.use(authMiddleware);
router.use(adminRoleMiddleware);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all system settings (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of system settings
 */
router.get('/settings', controller.getSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update a specific system setting (Admin only)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settingKey
 *               - settingValue
 *             properties:
 *               settingKey:
 *                 type: string
 *                 description: Key of the setting (e.g. SUBSCRIPTION_GRACE_PERIOD_DAYS)
 *               settingValue:
 *                 type: string
 *                 description: Value to set
 *     responses:
 *       200:
 *         description: Setting updated successfully
 */
router.put('/settings', validateRequest(updateSettingSchema), controller.updateSetting);

module.exports = router;
