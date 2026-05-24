'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('./extra-product.controller');
const {
  validateBody,
  validateQuery,
  createExtraProductSchema,
  updateExtraProductSchema,
  getExtraProductsSchema,
} = require('./extra-product.validator');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/vendor/extra-products:
 *   get:
 *     summary: Get extra products for a customer in a month
 *     tags: [Vendor, Extra Products]
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
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of extra products with dynamic total
 */
router.get('/', authMiddleware, validateQuery(getExtraProductsSchema), controller.getExtraProducts);

/**
 * @swagger
 * /api/v1/vendor/extra-products:
 *   post:
 *     summary: Add an extra product delivery
 *     tags: [Vendor, Extra Products]
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
 *               - productName
 *               - quantity
 *               - unit
 *               - price
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 example: "2026-03-23"
 *               productName:
 *                 type: string
 *                 example: "Dahi"
 *               quantity:
 *                 type: number
 *                 example: 500
 *               unit:
 *                 type: string
 *                 enum: [ml, ltr, kg, gm, packet]
 *               price:
 *                 type: number
 *                 example: 40
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Extra product created
 */
router.post('/', authMiddleware, validateBody(createExtraProductSchema), controller.addExtraProduct);

/**
 * @swagger
 * /api/v1/vendor/extra-products/{id}:
 *   put:
 *     summary: Update an extra product entry
 *     tags: [Vendor, Extra Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               price:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Extra product updated
 */
router.put('/:id', authMiddleware, validateBody(updateExtraProductSchema), controller.updateExtraProduct);

/**
 * @swagger
 * /api/v1/vendor/extra-products/{id}:
 *   delete:
 *     summary: Delete an extra product entry
 *     tags: [Vendor, Extra Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entry deleted
 */
router.delete('/:id', authMiddleware, controller.deleteExtraProduct);

module.exports = router;
