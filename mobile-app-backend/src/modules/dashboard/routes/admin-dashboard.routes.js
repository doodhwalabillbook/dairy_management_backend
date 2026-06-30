'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin-dashboard.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const adminRoleMiddleware = require('../../subscription/middlewares/admin-role.middleware');

// Ensure all dashboard routes require admin privilege
router.use(authMiddleware);
router.use(adminRoleMiddleware);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get Super Admin global dashboard data
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global statistics and charts data
 */
router.get('/', controller.getAdminDashboard);

module.exports = router;
