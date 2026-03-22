const express = require('express');
const router = express.Router();
const controller = require('../controllers/customer.controller');
const { validateRequest } = require('../validators/auth.validator');
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validator');
const authMiddleware = require('../middleware/auth.middleware');

// Apply JWT auth to all customer routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: Customer management endpoints
 */

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - name
 *               - phone
 *               - address
 *               - ratePerLiter
 *               - date
 *             properties:
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               name:
 *                 type: string
 *                 example: "Ramesh Kumar"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               address:
 *                 type: string
 *                 example: "123 Main St, Pune"
 *               ratePerLiter:
 *                 type: number
 *                 format: float
 *                 example: 52.50
 *               morningQuantity:
 *                 type: number
 *                 format: float
 *                 default: 0
 *                 example: 1.5
 *               eveningQuantity:
 *                 type: number
 *                 format: float
 *                 default: 0
 *                 example: 1.0
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-22"
 *     responses:
 *       201:
 *         description: Customer successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor not found
 *       409:
 *         description: Phone number already exists
 */
router.post('/', validateRequest(createCustomerSchema), controller.createCustomer);

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers (paginated, filterable)
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by vendor
 *     responses:
 *       200:
 *         description: Paginated list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 */
router.get('/', controller.getAllCustomers);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get('/:id', controller.getCustomerById);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               ratePerLiter:
 *                 type: number
 *               morningQuantity:
 *                 type: number
 *               eveningQuantity:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       409:
 *         description: Phone number already exists
 */
router.put('/:id', validateRequest(updateCustomerSchema), controller.updateCustomer);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Soft delete a customer (sets isActive = false)
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer deactivated successfully
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
 *                   $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.delete('/:id', controller.deleteCustomer);

module.exports = router;
