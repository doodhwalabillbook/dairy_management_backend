const prisma = require('../../config/prisma');
const vendorRepository = require('../../repositories/vendor.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const subscriptionStateService = require('../subscription/services/subscription-state.service');

const login = async (mobileNumber, pin) => {
  let vendor = await vendorRepository.findVendorByMobileWithUser(mobileNumber);
  let user;

  if (!vendor) {
    // Check if it is a global admin user
    user = await prisma.user.findUnique({
      where: { mobile: mobileNumber }
    });

    if (!user || user.role !== 'ADMIN') {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
  } else {
    user = vendor.user;
    if (vendor.status === 'INACTIVE') {
      const error = new Error('Account disabled. Please contact admin.');
      error.statusCode = 403;
      throw error;
    }
  }

  if (!user || !user.pinHash) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(pin, user.pinHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const payload = { 
    id: user.id,        // Maintains legacy support
    userId: user.id, 
    vendorId: vendor ? vendor.id : null,
    mobile: user.mobile, 
    role: user.role 
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  if (!vendor) {
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobile,
        role: user.role
      }
    };
  }

  const subscriptionSummary = await subscriptionStateService.getSubscriptionState(vendor.id);

  return {
    token,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      mobileNumber: vendor.mobileNumber,
      status: vendor.status
    },
    data: {
      vendorId: vendor.id,
      name: vendor.name,
      mobileNumber: vendor.mobileNumber,
      status: vendor.status,
      token
    },
    subscription: subscriptionSummary
  };
};

module.exports = { login };
