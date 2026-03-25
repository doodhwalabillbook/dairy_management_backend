const express = require('express');
const router = express.Router();
const controller = require('./admin.controller');
const areaRoutes = require('../area/area.routes');
const { 
  validateRequest, 
  validateQuery,
  adminProvisionSchema, 
  vendorRegistrationSchema,
  vendorUpdateSchema,
  vendorStatusSchema,
  vendorFiltersSchema
} = require('../../validators/auth.validator');

// Area CRUD Routes mapped
router.use('/areas', areaRoutes);

/**
 * @swagger
 * /api/v1/admin/vendors:
 *   get:
 *     summary: Get all vendors with pagination and filters
 *     tags: [Admin, Vendors]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or address
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: mobileNumber
 *         schema:
 *           type: string
 *         description: Exact match for mobile number
 *     responses:
 *       200:
 *         description: Paginated list of vendors
 */
router.get('/vendors', validateQuery(vendorFiltersSchema), controller.getVendors);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}:
 *   get:
 *     summary: Get a specific vendor by ID
 *     tags: [Admin, Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor details
 *       404:
 *         description: Vendor not found
 */
router.get('/vendors/:id', controller.getVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}:
 *   put:
 *     summary: Update vendor details
 *     tags: [Admin, Vendors]
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
 *               address:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *               registrationDate:
 *                 type: string
 *                 format: date
 *               billingStartDate:
 *                 type: string
 *                 format: date
 *               pin:
 *                 type: string
 *                 description: Only provide if changing the PIN
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Vendor not found
 *       409:
 *         description: Mobile number already registered
 */
router.put('/vendors/:id', validateRequest(vendorUpdateSchema), controller.updateVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}:
 *   delete:
 *     summary: Soft delete a vendor (sets status to INACTIVE)
 *     tags: [Admin, Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor deactivated successfully
 *       404:
 *         description: Vendor not found
 */
router.delete('/vendors/:id', controller.deleteVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a vendor
 *     tags: [Admin, Vendors]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/status', validateRequest(vendorStatusSchema), controller.changeStatus);

/**
 * @swagger
 * /api/v1/admin/vendors/registration:
 *   post:
 *     summary: Register a new vendor with full details (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - mobileNumber
 *               - registrationDate
 *               - billingStartDate
 *               - pin
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *                 description: 10-digit mobile number
 *               registrationDate:
 *                 type: string
 *                 format: date
 *               billingStartDate:
 *                 type: string
 *                 format: date
 *               pin:
 *                 type: string
 *                 description: 4 to 6 digit numeric PIN
 *     responses:
 *       201:
 *         description: Vendor registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Mobile number already registered
 */
router.post('/vendors/registration', validateRequest(vendorRegistrationSchema), controller.registerVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/provision:
 *   post:
 *     summary: Provision a new vendor (Admin only)
 *     deprecated: true
 *     description: This endpoint is deprecated. Use `/api/v1/admin/vendors/registration` instead.
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
