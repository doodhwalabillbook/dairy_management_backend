const express = require('express');
const router = express.Router();
const controller = require('./vendor-auth.controller');
const { validateRequest, vendorLoginSchema } = require('../../validators/auth.validator');

/**
 * @swagger
 * /api/v1/vendor/login:
 *   post:
 *     summary: Vendor Login (Mobile + PIN)
 *     tags: [Vendor Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *               - pin
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 description: 10-digit registered mobile number
 *               pin:
 *                 type: string
 *                 description: 4-6 digit numeric PIN
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled (INACTIVE)
 *       404:
 *         description: Vendor not found
 */
router.post('/login', validateRequest(vendorLoginSchema), controller.login);

module.exports = router;
