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
        { mobileNumber: { contains: search, mode: 'insensitive' } },
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

const findVendorByMobile = async (mobileNumber) =>
  prisma.vendor.findUnique({ where: { mobileNumber } });

/**
 * Creates a User + Vendor atomically in a transaction.
 * @param {object} userData  - { mobile, name, pinHash }
 * @param {object} vendorData - { name, address, mobileNumber, registrationDate, billingStartDate, companyId? }
 */
const createVendorWithUser = async (userData, vendorData) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        mobile: userData.mobile,
        name: userData.name,
        pinHash: userData.pinHash,
        role: 'VENDOR',
      },
    });

    const vendor = await tx.vendor.create({
      data: {
        user: { connect: { id: user.id } },
        name: vendorData.name,
        address: vendorData.address,
        mobileNumber: vendorData.mobileNumber,
        registrationDate: new Date(vendorData.registrationDate),
        billingStartDate: new Date(vendorData.billingStartDate),
        status: 'ACTIVE',
        ...(vendorData.companyId
          ? { companyId: vendorData.companyId }
          : { company: { create: { name: `${vendorData.name.trim()} - ${Date.now()}` } } }
        ),
      },
    });

    return { user, vendor };
  });
};

const getVendorsList = async ({ page = 1, size = 10, search, status, mobileNumber }) => {
  const skip = (page - 1) * size;
  const where = {};
  
  if (status) where.status = status;
  if (mobileNumber) where.mobileNumber = mobileNumber;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { address: { contains: search } }
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        mobileNumber: true,
        registrationDate: true,
        billingStartDate: true,
        status: true,
        createdAt: true,
        _count: {
          select: { customers: true }
        }
      }
    }),
    prisma.vendor.count({ where })
  ]);

  return { vendors, total };
};

const getVendorDetailById = async (id) => prisma.vendor.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    address: true,
    mobileNumber: true,
    registrationDate: true,
    billingStartDate: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: { customers: true }
    }
  }
});

const updateVendorData = async (id, vendorData, pinHash) => {
  const data = { ...vendorData };
  if (data.registrationDate) data.registrationDate = new Date(data.registrationDate);
  if (data.billingStartDate) data.billingStartDate = new Date(data.billingStartDate);

  // If a new PIN hash is provided, update the User record as well via nested update.
  if (pinHash) {
    data.user = {
      update: {
        pinHash
      }
    };
  }

  return prisma.vendor.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      address: true,
      mobileNumber: true,
      registrationDate: true,
      billingStartDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  });
};

const updateVendorStatus = async (id, status) => prisma.vendor.update({
  where: { id },
  data: { status },
  select: {
    id: true,
    name: true,
    status: true,
  }
});

const findVendorByMobileWithUser = async (mobileNumber) => prisma.vendor.findUnique({
  where: { mobileNumber },
  include: { user: true }
});

module.exports = {
  createVendor,
  findVendorsByCompany,
  findAllVendors,
  findVendorById,
  vendorPhoneExists,
  findVendorByMobile,
  findVendorByMobileWithUser,
  createVendorWithUser,
  getVendorsList,
  getVendorDetailById,
  updateVendorData,
  updateVendorStatus
};
