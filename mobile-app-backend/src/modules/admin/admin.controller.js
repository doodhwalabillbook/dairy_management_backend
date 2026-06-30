const adminService = require('./admin.service');

const registerVendor = async (req, res) => {
  try {
    const data = await adminService.registerVendor(req.body);
    res.status(201).json({
      message: 'Vendor registered successfully',
      data,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

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

const getVendors = async (req, res) => {
  try {
    const result = await adminService.getVendors(req.query);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.getVendorById(id);
    res.json({ data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.updateVendor(id, req.body);
    res.json({ message: 'Vendor updated successfully', data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteVendor(id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await adminService.changeVendorStatus(id, status);
    res.json({ message: 'Status updated successfully', data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await adminService.loginAdmin(email, password);
    res.json({ message: 'Login successful', ...result });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await adminService.forgotPasswordAdmin(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    const result = await adminService.resetPasswordAdmin(email, token, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerVendor,
  provisionVendor,
  forceResetPin,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  changeStatus,
  login,
  forgotPassword,
  resetPassword
};
