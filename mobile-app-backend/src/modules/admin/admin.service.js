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

const loginAdmin = async (email, password) => {
  const jwt = require('jsonwebtoken');
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.role !== 'ADMIN') {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account deactivated');
    error.statusCode = 403;
    throw error;
  }

  if (!user.passwordHash) {
    const error = new Error('Password credentials not set up. Please use Mobile/PIN login first.');
    error.statusCode = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const payload = {
    id: user.id,
    userId: user.id,
    vendorId: null,
    email: user.email,
    mobile: user.mobile,
    role: user.role
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobile,
      role: user.role
    }
  };
};

const forgotPasswordAdmin = async (email) => {
  const jwt = require('jsonwebtoken');

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.role !== 'ADMIN') {
    // Return generic response to avoid user enumeration
    return {
      success: true,
      message: 'If a matching admin account exists, a reset instruction has been sent.'
    };
  }

  // Generate a stateless reset token valid for 15 minutes
  const resetToken = jwt.sign(
    { email: user.email, type: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  console.log(`[MOCK EMAIL] Password reset token generated for ${email}: ${resetToken}`);

  return {
    success: true,
    message: 'Password reset token generated successfully.',
    resetToken
  };
};

const resetPasswordAdmin = async (email, token, newPassword) => {
  const jwt = require('jsonwebtoken');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired reset token');
    error.statusCode = 400;
    throw error;
  }

  if (decoded.type !== 'reset' || decoded.email !== email) {
    const error = new Error('Invalid or expired reset token');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.role !== 'ADMIN') {
    const error = new Error('Admin user not found');
    error.statusCode = 404;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  return {
    success: true,
    message: 'Password reset successfully'
  };
};

module.exports = {
  registerVendor,
  provisionVendor,
  forceResetPin,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  changeVendorStatus,
  loginAdmin,
  forgotPasswordAdmin,
  resetPasswordAdmin
};
