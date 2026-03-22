/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated UUID of the company
 *         name:
 *           type: string
 *           description: Name of the company
 *         city:
 *           type: string
 *           description: Locality or city
 *         isActive:
 *           type: boolean
 *           description: Is the company active
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Vendor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         companyId:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message details"
 */
