const vendorRepository = require('../../repositories/vendor.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (mobileNumber, pin) => {
  const vendor = await vendorRepository.findVendorByMobileWithUser(mobileNumber);

  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  if (vendor.status === 'INACTIVE') {
    const error = new Error('Account disabled. Please contact admin.');
    error.statusCode = 403;
    throw error;
  }

  if (!vendor.user || !vendor.user.pinHash) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(pin, vendor.user.pinHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const payload = { 
    id: vendor.user.id,        // Maintains legacy support if something uses id
    userId: vendor.user.id, 
    vendorId: vendor.id,
    mobile: vendor.mobileNumber, 
    role: vendor.user.role 
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    data: {
      vendorId: vendor.id,
      name: vendor.name,
      mobileNumber: vendor.mobileNumber,
      status: vendor.status,
      token
    }
  };
};

module.exports = { login };
