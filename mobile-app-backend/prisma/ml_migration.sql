-- =============================================================================
-- Dairy Management Backend — Litres to Millilitres (mL) Migration
-- Target Tables: CustomerMilkConfig, MilkDelivery
-- Purpose: Convert decimal Litre quantities (e.g. 0.5, 1.25) to Millilitres (500, 1250)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- UP MIGRATION (Liters -> mL)
-- -----------------------------------------------------------------------------
-- We check if any quantity is a decimal less than 20 (standard limit for Litres).
-- If all values are already >= 20 or 0, it indicates the migration has already run.
-- This ensures idempotency.

UPDATE `CustomerMilkConfig`
SET 
  `morningQuantity` = `morningQuantity` * 1000,
  `eveningQuantity` = `eveningQuantity` * 1000
WHERE 
  (`morningQuantity` > 0 AND `morningQuantity` < 20.00) OR 
  (`eveningQuantity` > 0 AND `eveningQuantity` < 20.00);

UPDATE `MilkDelivery`
SET 
  `morningQuantity` = `morningQuantity` * 1000,
  `eveningQuantity` = `eveningQuantity` * 1000
WHERE 
  (`morningQuantity` > 0 AND `morningQuantity` < 20.00) OR 
  (`eveningQuantity` > 0 AND `eveningQuantity` < 20.00);

-- -----------------------------------------------------------------------------
-- ROLLBACK MIGRATION (mL -> Liters)
-- -----------------------------------------------------------------------------
-- To rollback, uncomment and execute the queries below:
--
-- UPDATE `CustomerMilkConfig`
-- SET 
--   `morningQuantity` = `morningQuantity` / 1000,
--   `eveningQuantity` = `eveningQuantity` / 1000
-- WHERE 
--   `morningQuantity` >= 20.00 OR 
--   `eveningQuantity` >= 20.00;
--
-- UPDATE `MilkDelivery`
-- SET 
--   `morningQuantity` = `morningQuantity` / 1000,
--   `eveningQuantity` = `eveningQuantity` / 1000
-- WHERE 
--   `morningQuantity` >= 20.00 OR 
--   `eveningQuantity` >= 20.00;
