const express = require('express');
const router = express.Router();
const controller = require('../controllers/company.controller');
const { validateRequest } = require('../validators/auth.validator');
const { createCompanySchema, createVendorSchema } = require('../validators/company.validator');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/companies:
 *   post:
 *     summary: Register a new Company
 *     tags: [Company]
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
 *               city:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Validation Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Company name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validateRequest(createCompanySchema), controller.registerCompany);

/**
 * @swagger
 * /api/v1/companies:
 *   get:
 *     summary: Get all Companies
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Company'
 *       401:
 *         description: Unauthorized
 */
router.get('/', controller.getAllCompanies);

/**
 * @swagger
 * /api/v1/companies/{id}:
 *   get:
 *     summary: Get Company by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the company
 *     responses:
 *       200:
 *         description: Company details
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', controller.getCompanyById);

/**
 * @swagger
 * /api/v1/companies/vendors:
 *   post:
 *     summary: Register a Vendor under a Company
 *     tags: [Vendor]
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
 *               - phone
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       400:
 *         description: Validation Error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 *       409:
 *         description: Phone number duplicate in company
 */
router.post('/vendors', validateRequest(createVendorSchema), controller.registerVendor);

/**
 * @swagger
 * /api/v1/companies/{companyId}/vendors:
 *   get:
 *     summary: Get all Vendors for a specific Company
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of vendors
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:companyId/vendors', controller.getVendorsByCompany);

/**
 * @swagger
 * /api/v1/companies/vendors/all:
 *   get:
 *     summary: Search all Vendors globally
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, phone, or area
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated vendor list
 *       401:
 *         description: Unauthorized
 */
router.get('/vendors/all', controller.getAllVendors);

/**
 * @swagger
 * /api/v1/companies/vendors/{id}:
 *   get:
 *     summary: Get Vendor by ID
 *     tags: [Vendor]
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
 *         description: Vendor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       404:
 *         description: Vendor not found
 *       401:
 *         description: Unauthorized
 */
router.get('/vendors/:id', controller.getVendorById);

module.exports = router;
