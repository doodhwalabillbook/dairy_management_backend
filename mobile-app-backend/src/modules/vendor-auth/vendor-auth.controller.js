const vendorAuthService = require('./vendor-auth.service');

const login = async (req, res) => {
  try {
    const { mobileNumber, pin } = req.body;
    const result = await vendorAuthService.login(mobileNumber, pin);
    res.json({ message: 'Login successful', ...result });
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

module.exports = { login };
