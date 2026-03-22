const prisma = require('../config/prisma');

const createVendor = async (data) => prisma.vendor.create({ data });

const findVendorsByCompany = async (companyId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  return prisma.vendor.findMany({
    where: { companyId },
    skip,
    take: limit,
  });
};

const findAllVendors = async ({ page = 1, limit = 10, search = '' }) => {
  const skip = (page - 1) * limit;
  return prisma.vendor.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
      ]
    } : {},
    skip,
    take: limit,
    include: { company: { select: { name: true } } },
  });
};

const findVendorById = async (id) => prisma.vendor.findUnique({
  where: { id },
  include: { company: true },
});

const vendorPhoneExists = async (phone, companyId) => prisma.vendor.findFirst({
  where: { phone, companyId },
});

module.exports = { createVendor, findVendorsByCompany, findAllVendors, findVendorById, vendorPhoneExists };
