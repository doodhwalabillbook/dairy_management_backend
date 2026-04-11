'use strict';

/**
 * BillingCalculationService
 *
 * Core engine for computing customer billing over any date range.
 *
 * LAYER MODEL (applied at every level):
 *  Layer 1 — Date Boundary    : registrationDate (bandi start)
 *  Layer 2 — Config Selection : CustomerMilkConfig.effectiveFrom (versioned)
 *  Layer 3 — Delivery Override: MilkDelivery row (daily exception)
 *
 * Design rules:
 *  - ZERO per-day DB queries → all data passed in as pre-fetched arrays
 *  - Billing is ALWAYS computed, never stored
 *  - No date before registrationDate is ever processed
 *
 * @module billing.calculator
 */

// ─── Date Utility ─────────────────────────────────────────────────────────────

/**
 * Convert a Date or date-string to a YYYY-MM-DD string (UTC-safe).
 * @param {Date|string} d
 * @returns {string}
 */
const toDateStr = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split('T')[0];
};

/**
 * Return today's date normalised to UTC midnight (no time component).
 * @returns {Date}
 */
const utcToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// ─── Layer 1: Date Boundary ───────────────────────────────────────────────────

/**
 * Compute the effective [startDate, endDate] for a customer in a requested
 * month/year, enforcing the registrationDate boundary (Layer 1).
 *
 * Rules:
 *   IF requestedMonth < registrationMonth  → return null  (no data)
 *   IF requestedMonth == registrationMonth → startDate = registrationDate
 *   IF requestedMonth > registrationMonth  → startDate = 1st of requested month
 *
 *   endDate = last day of requested month, capped at today (UTC midnight).
 *   If startDate > endDate (e.g. registration date is still in the future
 *   this month) → return null.
 *
 * @param {Date|string} registrationDate - Customer bandi start date
 * @param {number}      month            - Requested month (1–12)
 * @param {number}      year             - Requested year  (e.g. 2026)
 * @returns {{ startDate: Date, endDate: Date } | null}
 *          null = customer has no data in this period
 */
const getEffectiveDateRange = (registrationDate, month, year) => {
  const regStr   = toDateStr(registrationDate);
  const regYear  = parseInt(regStr.substring(0, 4), 10);
  const regMonth = parseInt(regStr.substring(5, 7), 10);

  // ── Layer 1 check: queried period is entirely before registration ───────────
  if (year < regYear || (year === regYear && month < regMonth)) {
    return null;
  }

  // ── Determine startDate ─────────────────────────────────────────────────────
  let startDate;
  if (year === regYear && month === regMonth) {
    // Registration month: start from the exact bandi date
    startDate = new Date(regStr + 'T00:00:00Z');
  } else {
    // Later month: start from the 1st of the requested month
    startDate = new Date(Date.UTC(year, month - 1, 1));
  }

  // ── Determine endDate (last day of month, capped at today UTC) ─────────────
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)); // last day
  const today          = utcToday();
  const endDate        = today < lastDayOfMonth ? today : lastDayOfMonth;

  // ── Guard: registration date is still in the future this month ─────────────
  if (startDate > endDate) {
    return null;
  }

  return { startDate, endDate };
};

// ─── Layer 2: Config Selection ────────────────────────────────────────────────

/**
 * Build config ranges from a sorted list of CustomerMilkConfig rows.
 * Each range has an inclusive [fromStr, toStr] span.
 * The last config has toStr = null (open-ended).
 *
 * @param {Array} sortedConfigs - sorted ASC by effectiveFrom
 * @returns {Array<{ fromStr, toStr, morningQuantity, eveningQuantity, ratePerLiter }>}
 */
const buildConfigRanges = (sortedConfigs) => {
  return sortedConfigs.map((cfg, i) => {
    const next = sortedConfigs[i + 1];
    let toStr = null;
    if (next) {
      // This range ends the day BEFORE the next config starts
      const nextFrom = new Date(toDateStr(next.effectiveFrom) + 'T00:00:00Z');
      nextFrom.setUTCDate(nextFrom.getUTCDate() - 1);
      toStr = toDateStr(nextFrom);
    }
    return {
      fromStr:         toDateStr(cfg.effectiveFrom),
      toStr,
      morningQuantity: parseFloat(cfg.morningQuantity.toString()),
      eveningQuantity: parseFloat(cfg.eveningQuantity.toString()),
      ratePerLiter:    parseFloat(cfg.ratePerLiter.toString()),
    };
  });
};

/**
 * Layer 2: Find the applicable config for a given date.
 * Walks backwards through sorted ranges — the first range whose fromStr ≤ dateStr wins.
 *
 * @param {Array}  configRanges - output of buildConfigRanges()
 * @param {string} dateStr      - 'YYYY-MM-DD'
 * @returns {Object | null}
 */
const findConfigForDate = (configRanges, dateStr) => {
  for (let i = configRanges.length - 1; i >= 0; i--) {
    const range = configRanges[i];
    if (range.fromStr <= dateStr) {
      if (range.toStr === null || range.toStr >= dateStr) {
        return range;
      }
    }
  }
  return null;
};

// ─── Main Billing Function ────────────────────────────────────────────────────

/**
 * Calculate full billing for a single customer over [startDate, endDate].
 *
 * The caller is responsible for passing the correct startDate and endDate
 * (use getEffectiveDateRange()). This function is a pure in-memory engine.
 *
 * Three-layer processing per day:
 *   Layer 1: date must be >= registrationDate          (enforced via startDate)
 *   Layer 2: find applicable config via effectiveFrom  (Layer 2 logic)
 *   Layer 3: apply MilkDelivery override if it exists  (Layer 3 logic)
 *
 * @param {Object} params
 * @param {Object}  params.customer    - { id, name, address, registrationDate, remainingAmount }
 * @param {Date}    params.startDate   - Effective start (already Layer-1 clamped by caller)
 * @param {Date}    params.endDate     - Effective end (UTC midnight)
 * @param {Array}   params.configs     - All CustomerMilkConfig rows for this customer
 * @param {Array}   params.deliveries  - All MilkDelivery rows for this customer in range
 * @param {Array}   params.payments    - All Payment rows for this customer in period
 * @returns {Object} Full billing result
 */
const calculateCustomerBilling = ({
  customer,
  startDate,
  endDate,
  configs    = [],
  deliveries = [],
  payments   = [],
}) => {
  // ── Layer 1 safety net (in case caller did not pre-clamp) ─────────────────
  const registrationDateStr = toDateStr(customer.registrationDate);
  const startStr = toDateStr(startDate);
  const endStr   = toDateStr(endDate);
  const effectiveStartStr = startStr < registrationDateStr ? registrationDateStr : startStr;

  // ── Layer 2: Build config ranges (sorted ASC by effectiveFrom) ─────────────
  const sortedConfigs = [...configs].sort(
    (a, b) => toDateStr(a.effectiveFrom).localeCompare(toDateStr(b.effectiveFrom))
  );
  const configRanges = buildConfigRanges(sortedConfigs);

  // ── Layer 3: Build delivery override map { 'YYYY-MM-DD' → override } ────────
  const deliveryMap = {};
  for (const d of deliveries) {
    deliveryMap[toDateStr(d.date)] = {
      morningQuantity: parseFloat(d.morningQuantity.toString()),
      eveningQuantity: parseFloat(d.eveningQuantity.toString()),
      isEdited:        d.isEdited,
    };
  }

  // ── Day-by-day iteration (pure in-memory, zero DB queries) ──────────────────
  let totalMilk    = 0;
  let baseAmount   = 0;
  let totalMorning = 0;
  let totalEvening = 0;
  let totalDays    = 0;
  const dailyList  = [];

  if (effectiveStartStr <= endStr && configRanges.length > 0) {
    let cursor = new Date(effectiveStartStr + 'T00:00:00Z');
    const end  = new Date(endStr          + 'T00:00:00Z');

    while (cursor <= end) {
      const dateStr = toDateStr(cursor);

      // ── Layer 2: get applicable config ──
      const cfg = findConfigForDate(configRanges, dateStr);
      if (!cfg) {
        // No config applies yet for this date (date is before first config)
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }

      // ── Layer 3: apply delivery override or fall back to config ──
      let morning, evening, isEdited;
      if (deliveryMap[dateStr]) {
        const ov = deliveryMap[dateStr];
        morning  = ov.morningQuantity;
        evening  = ov.eveningQuantity;
        isEdited = true;
      } else {
        morning  = cfg.morningQuantity;
        evening  = cfg.eveningQuantity;
        isEdited = false;
      }

      const rate      = cfg.ratePerLiter;
      const dayTotal  = morning + evening;
      const dayAmount = parseFloat((dayTotal * rate).toFixed(4));

      totalMorning += morning;
      totalEvening += evening;
      totalMilk    += dayTotal;
      baseAmount   += dayAmount;
      if (dayTotal > 0) totalDays++;

      dailyList.push({
        date:            dateStr,
        morningQuantity: morning,
        eveningQuantity: evening,
        total:           dayTotal,
        ratePerLiter:    rate,
        amount:          dayAmount,
        isEdited,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  // ── Financial aggregation ─────────────────────────────────────────────────
  baseAmount        = parseFloat(baseAmount.toFixed(2));
  const openingDue  = parseFloat((customer.remainingAmount || 0).toString());
  const totalAmount = parseFloat((baseAmount + openingDue).toFixed(2));
  const totalPaid   = parseFloat(
    payments.reduce((sum, p) => sum + parseFloat(p.amountPaid.toString()), 0).toFixed(2)
  );
  const remaining   = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

  // ── Payment status ─────────────────────────────────────────────────────────
  let paymentStatus;
  if (totalAmount === 0)    paymentStatus = 'PAID';
  else if (totalPaid === 0) paymentStatus = 'UNPAID';
  else if (remaining <= 0)  paymentStatus = 'PAID';
  else                      paymentStatus = 'PARTIAL';

  return {
    customerId:          customer.id,
    name:                customer.name,
    address:             customer.address,
    registrationDate:    registrationDateStr,
    totalDaysMilkTaken:  totalDays,
    totalMorningMilk:    parseFloat(totalMorning.toFixed(2)),
    totalEveningMilk:    parseFloat(totalEvening.toFixed(2)),
    totalMilkDelivered:  parseFloat(totalMilk.toFixed(2)),
    baseAmount,
    openingDue,
    totalAmount,
    paymentPaid:         totalPaid,
    remainingPayment:    remaining,
    paymentStatus,
    dailyList,
    dateRange: {
      startDate: effectiveStartStr <= endStr ? effectiveStartStr : null,
      endDate:   effectiveStartStr <= endStr ? endStr             : null,
    },
  };
};

// ─── Single-Day Utility (Dashboard Today Summary) ────────────────────────────

/**
 * Compute milk delivery for a single date using pre-built lookup structures.
 * Applies all 3 layers for a single day.
 *
 * @param {Object} params
 * @param {Object}  params.customer       - Customer row (needs registrationDate)
 * @param {Array}   params.configRanges   - Pre-built via buildConfigRanges()
 * @param {Object}  params.deliveryMap    - Pre-built { 'YYYY-MM-DD': override }
 * @param {string}  params.targetDateStr  - 'YYYY-MM-DD'
 * @returns {{ morningQuantity, eveningQuantity, total, ratePerLiter, amount, isEdited }}
 */
const calculateDailyMilk = ({ customer, configRanges, deliveryMap, targetDateStr }) => {
  // ── Layer 1: registration date boundary ──
  const registrationDateStr = toDateStr(customer.registrationDate);
  if (targetDateStr < registrationDateStr) {
    return { morningQuantity: 0, eveningQuantity: 0, total: 0, ratePerLiter: 0, amount: 0, isEdited: false };
  }

  // ── Layer 2: config selection ──
  const cfg = findConfigForDate(configRanges, targetDateStr);
  if (!cfg) {
    return { morningQuantity: 0, eveningQuantity: 0, total: 0, ratePerLiter: 0, amount: 0, isEdited: false };
  }

  // ── Layer 3: delivery override ──
  let morning, evening, isEdited;
  if (deliveryMap[targetDateStr]) {
    const ov = deliveryMap[targetDateStr];
    morning  = ov.morningQuantity;
    evening  = ov.eveningQuantity;
    isEdited = true;
  } else {
    morning  = cfg.morningQuantity;
    evening  = cfg.eveningQuantity;
    isEdited = false;
  }

  const total  = morning + evening;
  const amount = parseFloat((total * cfg.ratePerLiter).toFixed(2));

  return {
    morningQuantity: morning,
    eveningQuantity: evening,
    total,
    ratePerLiter:    cfg.ratePerLiter,
    amount,
    isEdited,
  };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Public API
  getEffectiveDateRange,     // Layer 1 helper — use this in ALL services
  calculateCustomerBilling,  // Main billing engine
  calculateDailyMilk,        // Single-day helper for dashboard
  // Internals (exported for reuse in dashboard)
  buildConfigRanges,
  findConfigForDate,
  toDateStr,
  utcToday,
};
