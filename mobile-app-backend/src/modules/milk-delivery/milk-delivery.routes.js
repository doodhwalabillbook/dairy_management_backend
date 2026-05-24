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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customer:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     registrationDate:
 *                       type: string
 *                     currentConfig:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         morningQuantity:
 *                           type: number
 *                         eveningQuantity:
 *                           type: number
 *                         ratePerLiter:
 *                           type: number
 *                         effectiveFrom:
 *                           type: string
 *                 month:
 *                   type: integer
 *                 year:
 *                   type: integer
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       nullable: true
 *                     endDate:
 *                       type: string
 *                       nullable: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalDaysMilkTaken:
 *                       type: integer
 *                     totalMorningMilk:
 *                       type: number
 *                     totalEveningMilk:
 *                       type: number
 *                     totalMilkDelivered:
 *                       type: number
 *                     baseAmount:
 *                       type: number
 *                     extraProductAmount:
 *                       type: number
 *                     openingDue:
 *                       type: number
 *                     advanceAmount:
 *                       type: number
 *                     totalAmount:
 *                       type: number
 *                     totalPaid:
 *                       type: number
 *                     remainingAmount:
 *                       type: number
 *                     paymentStatus:
 *                       type: string
 *                       enum: [PAID, UNPAID, PARTIAL]
 *                 dailyList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       morningQuantity:
 *                         type: number
 *                       eveningQuantity:
 *                         type: number
 *                       total:
 *                         type: number
 *                       ratePerLiter:
 *                         type: number
 *                       amount:
 *                         type: number
 *                       isEdited:
 *                         type: boolean
 *                 extraProducts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       date:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       unit:
 *                         type: string
 *                       price:
 *                         type: number
 *                       notes:
 *                         type: string
 *                         nullable: true
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
