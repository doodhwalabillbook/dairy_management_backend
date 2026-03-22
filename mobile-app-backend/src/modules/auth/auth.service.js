const authRepository = require('./auth.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

const login = async (mobile, pin) => {
  const user = await authRepository.findUserByMobile(mobile);

  if (!user || !user.isActive) {
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

  const payload = { id: user.id, mobile: user.mobile, role: user.role };
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { user: payload, token };
};

const resetPin = async (mobile, currentPin, newPin) => {
  const user = await authRepository.findUserByMobile(mobile);

  if (!user || !user.isActive) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPin, user.pinHash);
  if (!isMatch) {
    const error = new Error('Invalid current PIN');
    error.statusCode = 400;
    throw error;
  }

  const newPinHash = await bcrypt.hash(newPin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash: newPinHash }
  });

  return { message: 'PIN updated successfully' };
};

module.exports = { login, resetPin };
