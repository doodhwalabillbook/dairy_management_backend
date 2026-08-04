'use strict';

/**
 * Reusable milk measurement and calculation helpers.
 */

/**
 * Convert Millilitres to Litres.
 * @param {number} ml
 * @returns {number}
 */
const convertMlToLitre = (ml) => {
  if (ml === null || ml === undefined || isNaN(ml)) return 0;
  return ml / 1000;
};

/**
 * Convert Litres to Millilitres.
 * @param {number} litre
 * @returns {number}
 */
const convertLitreToMl = (litre) => {
  if (litre === null || litre === undefined || isNaN(litre)) return 0;
  return litre * 1000;
};

/**
 * Calculate billing amount for a given quantity in mL and rate per Liter.
 * @param {number} ml
 * @param {number} ratePerLiter
 * @returns {number}
 */
const calculateBill = (ml, ratePerLiter) => {
  const liters = convertMlToLitre(ml);
  return parseFloat((liters * ratePerLiter).toFixed(4));
};

/**
 * Format milk quantity for display/reports.
 * Returns e.g. "350 mL" instead of "0.35 L".
 * @param {number} ml
 * @returns {string}
 */
const formatMilkQuantity = (ml) => {
  if (ml === null || ml === undefined || isNaN(ml)) return '0 mL';
  return `${ml} mL`;
};

module.exports = {
  convertMlToLitre,
  convertLitreToMl,
  calculateBill,
  formatMilkQuantity,
};
