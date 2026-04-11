-- =============================================================================
-- Dairy Management Backend — Schema Redesign Migration
-- Pure MySQL 8/9 compatible — no IF NOT EXISTS on indexes
-- Run ONCE against dairytrack_db before deploying new code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Create CustomerMilkConfig table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `CustomerMilkConfig` (
  `id`              VARCHAR(36)    NOT NULL,
  `customerId`      VARCHAR(36)    NOT NULL,
  `effectiveFrom`   DATE           NOT NULL,
  `morningQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `eveningQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `ratePerLiter`    DECIMAL(10, 2) NOT NULL,
  `createdAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `CustomerMilkConfig_customerId_effectiveFrom_key` (`customerId`, `effectiveFrom`),
  INDEX `CustomerMilkConfig_customerId_effectiveFrom_idx` (`customerId`, `effectiveFrom`),
  CONSTRAINT `CustomerMilkConfig_customerId_fkey`
    FOREIGN KEY (`customerId`) REFERENCES `Customer` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- STEP 2: Migrate existing Customer config data into CustomerMilkConfig
-- -----------------------------------------------------------------------------
INSERT INTO `CustomerMilkConfig`
  (`id`, `customerId`, `effectiveFrom`, `morningQuantity`, `eveningQuantity`, `ratePerLiter`, `createdAt`)
SELECT
  UUID()                      AS id,
  c.id                        AS customerId,
  DATE(c.registrationDate)    AS effectiveFrom,
  c.morningQuantity,
  c.eveningQuantity,
  c.ratePerLiter,
  NOW()
FROM `Customer` c
WHERE c.ratePerLiter IS NOT NULL
ON DUPLICATE KEY UPDATE
  `morningQuantity` = VALUES(`morningQuantity`),
  `eveningQuantity` = VALUES(`eveningQuantity`),
  `ratePerLiter`    = VALUES(`ratePerLiter`);

-- -----------------------------------------------------------------------------
-- STEP 3: Make Payment.createdBy / updatedBy nullable
-- -----------------------------------------------------------------------------
ALTER TABLE `Payment`
  MODIFY COLUMN `createdBy` VARCHAR(36) NULL,
  MODIFY COLUMN `updatedBy` VARCHAR(36) NULL;

-- -----------------------------------------------------------------------------
-- STEP 4: Add new indexes (all missing from current schema — safe to add)
-- -----------------------------------------------------------------------------

-- MilkDelivery: compound vendorId+date for dashboard queries
ALTER TABLE `MilkDelivery`
  ADD INDEX `MilkDelivery_vendorId_date_idx` (`vendorId`, `date`);

-- Payment: compound customerId+month+year for fast billing lookups
ALTER TABLE `Payment`
  ADD INDEX `Payment_customerId_month_year_idx` (`customerId`, `month`, `year`);

-- Customer: compound phone+vendorId for per-vendor uniqueness checks
ALTER TABLE `Customer`
  ADD INDEX `Customer_phone_vendorId_idx` (`phone`, `vendorId`);

-- -----------------------------------------------------------------------------
-- STEP 5: Drop global phone uniqueness (replaced by per-vendor check in app)
-- -----------------------------------------------------------------------------
ALTER TABLE `Customer`
  DROP INDEX `Customer_phone_key`;

-- -----------------------------------------------------------------------------
-- STEP 6: Remove deprecated config columns from Customer
-- -----------------------------------------------------------------------------
ALTER TABLE `Customer`
  DROP COLUMN `ratePerLiter`,
  DROP COLUMN `morningQuantity`,
  DROP COLUMN `eveningQuantity`;

-- -----------------------------------------------------------------------------
-- Done. Next: run `npx prisma generate` to regenerate the Prisma client.
-- -----------------------------------------------------------------------------
