const authService = require('./auth.service');

const login = async (req, res) => {
  try {
    const { mobile, pin } = req.body;
    const result = await authService.login(mobile, pin);
    res.json({ message: 'Login successful', ...result });
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

const resetPin = async (req, res) => {
  try {
    const { mobile, currentPin, newPin } = req.body;
    const result = await authService.resetPin(mobile, currentPin, newPin);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

module.exports = { login, resetPin };
