const authService = require('./auth.service');

const resetPin = async (req, res) => {
  try {
    const { mobile, currentPin, newPin } = req.body;
    const result = await authService.resetPin(mobile, currentPin, newPin);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

module.exports = { resetPin };
