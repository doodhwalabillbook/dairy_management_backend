const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { validateRequest, loginSchema, resetPinSchema } = require('../../validators/auth.validator');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user (Mobile + PIN)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validateRequest(loginSchema), controller.login);

/**
 * @swagger
 * /api/v1/auth/reset-pin:
 *   post:
 *     summary: Vendor resets their own PIN
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               currentPin:
 *                 type: string
 *               newPin:
 *                 type: string
 *     responses:
 *       200:
 *         description: PIN updated successfully
 */
router.post('/reset-pin', authMiddleware, validateRequest(resetPinSchema), controller.resetPin);

module.exports = router;
