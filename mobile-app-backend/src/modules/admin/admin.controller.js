const adminService = require('./admin.service');

const provisionVendor = async (req, res) => {
  try {
    const { mobile, name } = req.body;
    const result = await adminService.provisionVendor(mobile, name);
    res.json({ message: 'Vendor provisioned successfully', ...result });
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

const forceResetPin = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.forceResetPin(id);
    res.json({ message: 'PIN reset successfully', ...result });
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

module.exports = { provisionVendor, forceResetPin };
