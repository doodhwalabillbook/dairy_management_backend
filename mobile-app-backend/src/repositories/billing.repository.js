const prisma = require('../config/prisma');
const { Prisma } = require('../generated/prisma');

/**
 * Fetch per-customer aggregated billing data for a given month and year.
 *
 * Uses a single raw SQL query with GROUP BY + SUM to avoid N+1 queries.
 * The query:
 *   - LEFT JOINs MilkDelivery filtered to the requested month/year
 *   - LEFT JOINs Payment filtered to the requested month/year
 *   - Returns one row per active customer with all aggregated values
 *
 * @param {number} month  - 1..12
 * @param {number} year   - e.g. 2026
 * @param {string|null} vendorId - optional vendor filter
 * @returns {Array} Raw aggregated rows
 */
const getAggregatedBillingData = async (month, year) => {
  /**
   * We use Prisma.$queryRaw for this aggregation because Prisma's fluent API
   * doesn't support conditional LEFT JOIN aggregations in a single query.
   *
   * Prisma.sql tagged template handles parameterization safely.
   */
  const rows = await prisma.$queryRaw`
    SELECT
      c.id                                                          AS customerId,
      c.name                                                        AS name,
      c.address                                                     AS address,
      CAST(c.ratePerLiter AS DECIMAL(10,2))                        AS ratePerLiter,

      /* Count days where any milk was delivered */
      COUNT(
        DISTINCT CASE
          WHEN (md.morningQuantity + md.eveningQuantity) > 0
          THEN md.date
          ELSE NULL
        END
      )                                                             AS totalDaysMilkTaken,

      /* Total litres delivered in the month */
      COALESCE(
        SUM(md.morningQuantity + md.eveningQuantity), 0
      )                                                             AS totalMilkDelivered,

      /* Total payments received in the month */
      COALESCE(SUM(DISTINCT p.amountPaid_grouped), 0)              AS paymentPaid

    FROM Customer c

    /* Only active customers */
    WHERE c.isActive = TRUE

    /* LEFT JOIN milk deliveries for the requested month/year */
    LEFT JOIN MilkDelivery md
      ON md.customerId = c.id
      AND MONTH(md.date) = ${month}
      AND YEAR(md.date)  = ${year}

    /* Aggregate payments in a subquery to avoid cross-join duplication */
    LEFT JOIN (
      SELECT customerId, SUM(amountPaid) AS amountPaid_grouped
      FROM Payment
      WHERE MONTH(paymentDate) = ${month}
        AND YEAR(paymentDate)  = ${year}
      GROUP BY customerId
    ) p ON p.customerId = c.id

    GROUP BY c.id, c.name, c.address, c.ratePerLiter
    ORDER BY c.name ASC
  `;

  return rows;
};

/**
 * Fetch aggregated billing data filtered by vendorId.
 * Same query as above but adds a WHERE clause on vendorId.
 */
const getAggregatedBillingDataByVendor = async (month, year, vendorId) => {
  const rows = await prisma.$queryRaw`
    SELECT
      c.id                                                          AS customerId,
      c.name                                                        AS name,
      c.address                                                     AS address,
      CAST(c.ratePerLiter AS DECIMAL(10,2))                        AS ratePerLiter,

      COUNT(
        DISTINCT CASE
          WHEN (md.morningQuantity + md.eveningQuantity) > 0
          THEN md.date
          ELSE NULL
        END
      )                                                             AS totalDaysMilkTaken,

      COALESCE(
        SUM(md.morningQuantity + md.eveningQuantity), 0
      )                                                             AS totalMilkDelivered,

      COALESCE(SUM(DISTINCT p.amountPaid_grouped), 0)              AS paymentPaid

    FROM Customer c

    WHERE c.isActive = TRUE
      AND c.vendorId = ${vendorId}

    LEFT JOIN MilkDelivery md
      ON md.customerId = c.id
      AND MONTH(md.date) = ${month}
      AND YEAR(md.date)  = ${year}

    LEFT JOIN (
      SELECT customerId, SUM(amountPaid) AS amountPaid_grouped
      FROM Payment
      WHERE MONTH(paymentDate) = ${month}
        AND YEAR(paymentDate)  = ${year}
      GROUP BY customerId
    ) p ON p.customerId = c.id

    GROUP BY c.id, c.name, c.address, c.ratePerLiter
    ORDER BY c.name ASC
  `;

  return rows;
};

module.exports = { getAggregatedBillingData, getAggregatedBillingDataByVendor };

// ─── Payment Repository Methods ───────────────────────────────────────────────

/**
 * Insert a new payment record.
 * @param {Object} data - Validated payment fields + createdBy/updatedBy
 */
const createPayment = async (data) =>
  prisma.payment.create({
    data,
    include: { customer: { select: { id: true, name: true } } },
  });

/**
 * Compute the total milk billing amount for a customer in a specific month/year.
 * Returns totalMilkDelivered, ratePerLiter, and the running totalPaid.
 * Uses a single raw SQL query to avoid multiple round-trips.
 */
const getCustomerMonthBillingTotals = async (customerId, month, year) => {
  const rows = await prisma.$queryRaw`
    SELECT
      CAST(c.ratePerLiter AS DECIMAL(10,2))                     AS ratePerLiter,
      COALESCE(SUM(md.morningQuantity + md.eveningQuantity), 0) AS totalMilkDelivered,
      COALESCE(p.totalPaid, 0)                                  AS totalPaid
    FROM Customer c

    LEFT JOIN MilkDelivery md
      ON md.customerId = c.id
      AND MONTH(md.date) = ${month}
      AND YEAR(md.date)  = ${year}

    LEFT JOIN (
      SELECT customerId, SUM(amountPaid) AS totalPaid
      FROM Payment
      WHERE customerId    = ${customerId}
        AND month         = ${month}
        AND year          = ${year}
      GROUP BY customerId
    ) p ON p.customerId = c.id

    WHERE c.id = ${customerId}
    GROUP BY c.id, c.ratePerLiter, p.totalPaid
  `;

  return rows[0] || null;
};

/**
 * Fetch payment history for a customer, optionally filtered by month/year.
 */
const findPaymentHistory = async (customerId, { month, year } = {}) => {
  const where = { customerId };
  if (month !== undefined) where.month = month;
  if (year !== undefined) where.year = year;

  return prisma.payment.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    select: {
      id: true,
      amountPaid: true,
      paymentDate: true,
      month: true,
      year: true,
      paymentMode: true,
      notes: true,
      createdAt: true,
    },
  });
};

module.exports = {
  getAggregatedBillingData,
  getAggregatedBillingDataByVendor,
  createPayment,
  getCustomerMonthBillingTotals,
  findPaymentHistory,
};
