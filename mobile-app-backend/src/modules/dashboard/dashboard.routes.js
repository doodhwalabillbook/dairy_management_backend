const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/vendor/dashboard:
 *   get:
 *     summary: Vendor Dashboard (Today + Monthly Summary)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Custom specific date e.g. 2026-03-22"
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: "1-12"
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully fetched dashboard arrays!
 */
router.get('/', controller.getDashboardData);

module.exports = router;
