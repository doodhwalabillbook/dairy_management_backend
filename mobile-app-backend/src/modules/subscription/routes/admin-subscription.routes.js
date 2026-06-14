'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin-subscription.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const adminRoleMiddleware = require('../middlewares/admin-role.middleware');
const { rejectRequestSchema } = require('../validators/subscription.validator');

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

// All endpoints require Authentication and Admin privileges
router.use(authMiddleware);
router.use(adminRoleMiddleware);

/**
 * @swagger
 * /api/admin/subscriptions/requests:
 *   get:
 *     summary: Get all pending subscription requests (Admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending subscription upgrade/renewal requests
 */
router.get('/requests', controller.getPendingRequests);

/**
 * @swagger
 * /api/admin/subscriptions/requests/{id}:
 *   get:
 *     summary: Get details of a subscription request by ID (Admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subscription request details
 */
router.get('/requests/:id', controller.getRequestById);

/**
 * @swagger
 * /api/admin/subscriptions/requests/{id}/approve:
 *   put:
 *     summary: Approve a subscription request manually (Admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subscription approved and active subscription returned
 */
router.put('/requests/:id/approve', controller.approveRequest);

/**
 * @swagger
 * /api/admin/subscriptions/requests/{id}/reject:
 *   put:
 *     summary: Reject a subscription request (Admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - remarks
 *             properties:
 *               remarks:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Subscription request rejected successfully
 */
router.put('/requests/:id/reject', validateRequest(rejectRequestSchema), controller.rejectRequest);

/**
 * @swagger
 * /api/admin/subscriptions/vendors:
 *   get:
 *     summary: Get subscriptions status for all vendors (Admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all vendor subscriptions
 */
router.get('/vendors', controller.getVendors);

module.exports = router;
