const authRepository = require('../auth/auth.repository');
const vendorRepository = require('../../repositories/vendor.repository');
const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Register a new vendor with full details.
 * Creates both a User (for auth) and a Vendor record atomically.
 */
const registerVendor = async (payload) => {
  const { name, address, mobileNumber, pin } = payload;

  // Check mobileNumber uniqueness on Vendor table
  const existingVendor = await vendorRepository.findVendorByMobile(mobileNumber);
  if (existingVendor) {
    const error = new Error('Mobile number already registered');
    error.statusCode = 409;
    throw error;
  }

  // Also check User table (used for auth login)
  const existingUser = await authRepository.findUserByMobile(mobileNumber);
  if (existingUser) {
    const error = new Error('Mobile number already registered');
    error.statusCode = 409;
    throw error;
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { user, vendor } = await vendorRepository.createVendorWithUser(
    { mobile: mobileNumber, name, pinHash },
    { name, address, mobileNumber }
  );

  return {
    vendorId: vendor.id,
    name: vendor.name,
    address: vendor.address,
    mobileNumber: vendor.mobileNumber,
    status: vendor.status,
    createdAt: vendor.createdAt,
  };
};

/**
 * @deprecated Use registerVendor instead.
 * Kept for backward compatibility with POST /admin/vendors/provision.
 */
const provisionVendor = async (mobile, name) => {
  const existing = await authRepository.findUserByMobile(mobile);
  if (existing) {
    const error = new Error('Mobile number already registered');
    error.statusCode = 409;
    throw error;
  }

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const vendor = await authRepository.createUser({
    mobile,
    name,
    pinHash,
    role: 'VENDOR'
  });

  return { vendor, pin };
};

const forceResetPin = async (vendorId) => {
  const vendor = await prisma.user.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.update({
    where: { id: vendorId },
    data: { pinHash }
  });

  return { newPin: pin };
};

const getVendors = async (queryParams) => {
  const result = await vendorRepository.getVendorsList(queryParams);
  return {
    data: result.vendors,
    pagination: {
      page: queryParams.page,
      size: queryParams.size,
      totalRecords: result.total
    }
  };
};

const getVendorById = async (vendorId) => {
  const vendor = await vendorRepository.getVendorDetailById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }
  return vendor;
};

const updateVendor = async (vendorId, payload) => {
  const existingVendor = await vendorRepository.getVendorDetailById(vendorId);
  if (!existingVendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  // If mobileNumber is being updated, ensure it's unique
  if (payload.mobileNumber && payload.mobileNumber !== existingVendor.mobileNumber) {
    const duplicate = await vendorRepository.findVendorByMobile(payload.mobileNumber);
    if (duplicate) {
      const error = new Error('Mobile number already registered by another vendor');
      error.statusCode = 409;
      throw error;
    }
    
    // Also check auth User table
    const existingUser = await authRepository.findUserByMobile(payload.mobileNumber);
    if (existingUser) {
      const error = new Error('Mobile number already registered in users table');
      error.statusCode = 409;
      throw error;
    }
  }

  let pinHash = undefined;
  if (payload.pin) {
    pinHash = await bcrypt.hash(payload.pin, 10);
  }

  // Omit PIN from payload so it doesn't try to save passing straight through to DB fields
  const vendorData = { ...payload };
  delete vendorData.pin;

  return vendorRepository.updateVendorData(vendorId, vendorData, pinHash);
};

const deleteVendor = async (vendorId) => {
  const existingVendor = await vendorRepository.getVendorDetailById(vendorId);
  if (!existingVendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  await vendorRepository.updateVendorStatus(vendorId, 'INACTIVE');
  return { success: true, message: 'Vendor deactivated successfully' };
};

const changeVendorStatus = async (vendorId, status) => {
  const existingVendor = await vendorRepository.getVendorDetailById(vendorId);
  if (!existingVendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  return vendorRepository.updateVendorStatus(vendorId, status);
};

module.exports = {
  registerVendor,
  provisionVendor,
  forceResetPin,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  changeVendorStatus
};
