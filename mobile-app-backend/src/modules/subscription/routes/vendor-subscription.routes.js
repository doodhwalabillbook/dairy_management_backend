'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/vendor-subscription.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const { createRequestSchema, renewRequestSchema } = require('../validators/subscription.validator');

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

// All endpoints require Authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all active subscription plans
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active subscription plans
 */
router.get('/plans', controller.getPlans);

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get current active subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 */
router.get('/current', controller.getCurrentSubscription);

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     summary: Get dynamic subscription status, days remaining, limits, and state
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status summary and state details
 */
router.get('/status', controller.getSubscriptionStatus);

/**
 * @swagger
 * /api/subscriptions/history:
 *   get:
 *     summary: Get audit history of all vendor subscription changes
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History logs of subscriptions
 */
router.get('/history', controller.getSubscriptionHistory);

/**
 * @swagger
 * /api/subscriptions/request-history:
 *   get:
 *     summary: Get history of all subscription upgrade/renewal requests submitted by the vendor
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request history logs
 */
router.get('/request-history', controller.getRequestHistory);

/**
 * @swagger
 * /api/subscriptions/request:
 *   post:
 *     summary: Submit a subscription upgrade request
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - paymentMode
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *               paymentMode:
 *                 type: string
 *                 enum: [CASH, QR_CODE]
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subscription request submitted successfully
 */
router.post('/request', validateRequest(createRequestSchema), controller.createRequest);

/**
 * @swagger
 * /api/subscriptions/renew:
 *   post:
 *     summary: Submit a request to renew the current active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMode
 *             properties:
 *               paymentMode:
 *                 type: string
 *                 enum: [CASH, QR_CODE]
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Renewal request submitted successfully
 */
router.post('/renew', validateRequest(renewRequestSchema), controller.renewRequest);

module.exports = router;
