const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { validateRequest, resetPinSchema } = require('../../validators/auth.validator');
const authMiddleware = require('../../middleware/auth.middleware');

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
