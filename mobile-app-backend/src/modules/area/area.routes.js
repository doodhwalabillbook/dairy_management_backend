const express = require('express');
const router = express.Router();
const controller = require('./area.controller');
const { 
  validateRequest, 
  validateQuery, 
  createAreaSchema, 
  updateAreaSchema, 
  areaFiltersSchema 
} = require('../../validators/area.validator');
const authMiddleware = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/admin/areas:
 *   post:
 *     summary: Create a new Area
 *     tags: [Admin, Area]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Area created
 */
router.post('/', authMiddleware, validateRequest(createAreaSchema), controller.createArea);

/**
 * @swagger
 * /api/v1/admin/areas:
 *   get:
 *     summary: Get all Areas with pagination and filtering
 *     tags: [Admin, Area]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: List of Areas
 */
router.get('/', authMiddleware, validateQuery(areaFiltersSchema), controller.getAreas);

/**
 * @swagger
 * /api/v1/admin/areas/{id}:
 *   get:
 *     summary: Get specific Area by ID
 *     tags: [Admin, Area]
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
 *         description: Area detailed object
 */
router.get('/:id', authMiddleware, controller.getArea);

/**
 * @swagger
 * /api/v1/admin/areas/{id}:
 *   put:
 *     summary: Update an Area 
 *     tags: [Admin, Area]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Target updated successfully
 */
router.put('/:id', authMiddleware, validateRequest(updateAreaSchema), controller.updateArea);

/**
 * @swagger
 * /api/v1/admin/areas/{id}:
 *   delete:
 *     summary: Soft delete an Area (Sets status to INACTIVE)
 *     tags: [Admin, Area]
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
 *         description: Successfully soft deleted
 */
router.delete('/:id', authMiddleware, controller.deleteArea);

/**
 * @swagger
 * /api/v1/admin/areas/{areaId}/customers:
 *   get:
 *     summary: Get all customers strictly connected to this Area location
 *     tags: [Admin, Area]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: areaId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Returns Customers enclosed with Area metadata
 */
router.get('/:areaId/customers', authMiddleware, validateQuery(areaFiltersSchema), controller.getCustomersByArea);

module.exports = router;
