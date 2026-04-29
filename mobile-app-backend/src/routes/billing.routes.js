const express = require('express');
const router = express.Router();
const controller = require('../controllers/billing.controller');
const {
  billingQuerySchema,
  createPaymentSchema,
  paymentHistoryQuerySchema,
  validateQuery,
} = require('../validators/billing.validator');
const { validateRequest } = require('../validators/auth.validator');
const authMiddleware = require('../middleware/auth.middleware');

// All billing routes require a valid JWT
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Month/year aggregated billing reports
 */

/**
 * @swagger
 * /api/v1/billing:
 *   get:
 *     summary: Get aggregated billing data for a month and year
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month number (1–12)
 *         example: 3
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2000
 *         description: Four-digit year
 *         example: 2026
 *       - in: query
 *         name: filterType
 *         schema:
 *           type: string
 *           enum: [ALL, PAID, UNPAID]
 *           default: ALL
 *         description: Filter customers by payment status
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional — restrict results to a specific vendor's customers
 *     responses:
 *       200:
 *         description: Billing report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 month:
 *                   type: integer
 *                 year:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalEarning:
 *                       type: number
 *                     totalPaymentPaid:
 *                       type: number
 *                     totalRemainingPayment:
 *                       type: number
 *                     totalCustomers:
 *                       type: integer
 *                     paidCustomersCount:
 *                       type: integer
 *                     unpaidCustomersCount:
 *                       type: integer
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       totalDaysMilkTaken:
 *                         type: integer
 *                       totalMilkDelivered:
 *                         type: number
 *                       ratePerLiter:
 *                         type: number
 *                       totalAmount:
 *                         type: number
 *                       paymentPaid:
 *                         type: number
 *                       remainingPayment:
 *                         type: number
 *                       paymentStatus:
 *                         type: string
 *                         enum: [PAID, UNPAID]
 *       400:
 *         description: Validation error (missing/invalid month, year, or filterType)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateQuery(billingQuerySchema), controller.getBilling);

/**
 * @swagger
 * /api/v1/billing/payment:
 *   post:
 *     summary: Record a customer payment
 *     tags: [Billing]
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
 *               - amountPaid
 *               - paymentDate
 *               - month
 *               - year
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               amountPaid:
 *                 type: number
 *                 example: 2000
 *               extraAmount:
 *                 type: number
 *                 example: 200
 *               extraDescription:
 *                 type: string
 *                 example: "Cheese"
 *               paymentDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-22"
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 3
 *               year:
 *                 type: integer
 *                 example: 2026
 *               paymentMode:
 *                 type: string
 *                 enum: [CASH, UPI, CARD]
 *                 default: CASH
 *               notes:
 *                 type: string
 *                 example: "Partial payment for March"
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: string
 *                     month:
 *                       type: integer
 *                     year:
 *                       type: integer
 *                     baseAmount:
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
 *                       enum: [PAID, PARTIAL, UNPAID]
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.post('/payment', validateRequest(createPaymentSchema), controller.recordPayment);

/**
 * @swagger
 * /api/v1/billing/payment/{customerId}:
 *   get:
 *     summary: Get payment history for a customer
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Optional month filter
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Optional year filter
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 totalPaid:
 *                   type: number
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       amountPaid:
 *                         type: number
 *                       paymentDate:
 *                         type: string
 *                         format: date
 *                       month:
 *                         type: integer
 *                       year:
 *                         type: integer
 *                       paymentMode:
 *                         type: string
 *                         enum: [CASH, UPI, CARD]
 *                       notes:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get('/payment/:customerId', validateQuery(paymentHistoryQuerySchema), controller.getPaymentHistory);

module.exports = router;
