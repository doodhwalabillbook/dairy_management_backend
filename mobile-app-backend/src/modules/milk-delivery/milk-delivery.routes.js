const express = require('express');
const router = express.Router();
const controller = require('./milk-delivery.controller');
const { 
  validateQuery, 
  validateBody, 
  getMonthlyListSchema, 
  updateDailyEntrySchema 
} = require('../../validators/milk-delivery.validator');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/vendor/milk-delivery:
 *   get:
 *     summary: Get generated Daily Milk Delivery (Badi List) aggregated monthly dynamically
 *     tags: [Vendor, Milk Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: "Month number (1-12)"
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: "4-digit year (Ex: 2026)"
 *     responses:
 *       200:
 *         description: Generated daily list overlaid with overrides dynamically generated up to today reliably
 */
router.get('/', authMiddleware, validateQuery(getMonthlyListSchema), controller.getMonthlyBadiList);

/**
 * @swagger
 * /api/v1/vendor/milk-delivery:
 *   post:
 *     summary: Upsert Daily Entry tracking overrides accurately cleanly overwriting standard mapped Customer baseline rules natively.
 *     tags: [Vendor, Milk Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - date
 *               - morningQuantity
 *               - eveningQuantity
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 example: "2026-03-24"
 *               morningQuantity:
 *                 type: number
 *                 example: 5
 *               eveningQuantity:
 *                 type: number
 *                 example: 2
 *     responses:
 *       200:
 *         description: Updated properly securely mapped
 */
router.post('/', authMiddleware, validateBody(updateDailyEntrySchema), controller.updateDailyEntry);

module.exports = router;
