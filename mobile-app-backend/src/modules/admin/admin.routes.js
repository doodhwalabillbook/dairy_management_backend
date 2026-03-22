const express = require('express');
const router = express.Router();
const controller = require('./admin.controller');
const { validateRequest, adminProvisionSchema } = require('../../validators/auth.validator');

/**
 * @swagger
 * /api/v1/admin/vendors/provision:
 *   post:
 *     summary: Provision a new vendor (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor provisioned
 */
router.post('/vendors/provision', validateRequest(adminProvisionSchema), controller.provisionVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/reset-pin:
 *   post:
 *     summary: Force reset a vendor's PIN (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: PIN reset successfully
 */
router.post('/vendors/:id/reset-pin', controller.forceResetPin);

module.exports = router;
