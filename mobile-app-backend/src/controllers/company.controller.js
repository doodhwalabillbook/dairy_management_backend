const companyService = require('../services/company.service');

const registerCompany = async (req, res, next) => {
  try {
    const company = await companyService.registerCompany(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.getAllCompanies(req.query);
    res.json({ success: true, data: companies });
  } catch (err) {
    next(err);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

const registerVendor = async (req, res, next) => {
  try {
    const vendor = await companyService.registerVendor(req.body.companyId, req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

const getVendorsByCompany = async (req, res, next) => {
  try {
    const vendors = await companyService.getVendorsByCompany(req.params.companyId, req.query);
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
};

const getAllVendors = async (req, res, next) => {
  try {
    const vendors = await companyService.getAllVendors(req.query);
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor = await companyService.getVendorById(req.params.id);
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerCompany,
  getAllCompanies,
  getCompanyById,
  registerVendor,
  getVendorsByCompany,
  getAllVendors,
  getVendorById,
};
