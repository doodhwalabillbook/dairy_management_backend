const companyRepo = require('../repositories/company.repository');
const vendorRepo = require('../repositories/vendor.repository');

const registerCompany = async (data) => {
  const existing = await companyRepo.companyExists(data.name);
  if (existing) {
    const error = new Error('Company name already exists');
    error.statusCode = 409;
    throw error;
  }
  return companyRepo.createCompany(data);
};

const getAllCompanies = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  return companyRepo.findAllCompanies({ page, limit });
};

const getCompanyById = async (id) => {
  const company = await companyRepo.findCompanyById(id);
  if (!company) {
    const error = new Error('Company not found');
    error.statusCode = 404;
    throw error;
  }
  return company;
};

const registerVendor = async (companyId, data) => {
  const company = await companyRepo.findCompanyById(companyId);
  if (!company) {
    const error = new Error('Company not found');
    error.statusCode = 404;
    throw error;
  }
  const duplicatePhone = await vendorRepo.vendorPhoneExists(data.phone, companyId);
  if (duplicatePhone) {
    const error = new Error('Phone number already exists in this company');
    error.statusCode = 409;
    throw error;
  }
  return vendorRepo.createVendor({ ...data, companyId });
};

const getVendorsByCompany = async (companyId, query) => {
  const company = await companyRepo.findCompanyById(companyId);
  if (!company) {
    const error = new Error('Company not found');
    error.statusCode = 404;
    throw error;
  }
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  return vendorRepo.findVendorsByCompany(companyId, { page, limit });
};

const getAllVendors = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const search = query.search || '';
  return vendorRepo.findAllVendors({ page, limit, search });
};

const getVendorById = async (id) => {
  const vendor = await vendorRepo.findVendorById(id);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }
  return vendor;
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
