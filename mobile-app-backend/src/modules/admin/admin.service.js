const authRepository = require('../auth/auth.repository');
const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

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

module.exports = { provisionVendor, forceResetPin };
