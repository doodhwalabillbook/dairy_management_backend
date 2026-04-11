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

/**
 * Register a vendor under a company.
 *
 * Creates a User record (for login) AND a Vendor record atomically in a
 * single transaction. The PIN is hashed before storage — the raw PIN is
 * never persisted.
 *
 * Required body fields:
 *   companyId, name, mobileNumber, pin, registrationDate, billingStartDate
 */
const registerVendor = async (companyId, data) => {
  const bcrypt = require('bcrypt');

  // 1. Validate company exists
  const company = await companyRepo.findCompanyById(companyId);
  if (!company) {
    const error = new Error('Company not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. mobileNumber is the login credential — must be globally unique
  const existingMobile = await vendorRepo.findVendorByMobile(data.mobileNumber);
  if (existingMobile) {
    const error = new Error('A vendor with this mobile number already exists');
    error.statusCode = 409;
    throw error;
  }

  // 3. Hash the PIN (bcrypt, cost 10)
  const pinHash = await bcrypt.hash(String(data.pin), 10);

  // 4. User payload — mobile is the login identifier
  const userData = {
    mobile:  data.mobileNumber,
    name:    data.name,
    pinHash,
  };

  // 5. Vendor payload — no raw pin stored here
  const vendorData = {
    companyId:        companyId,
    name:             data.name,
    mobileNumber:     data.mobileNumber,
    phone:            data.phone            || null,
    email:            data.email            || null,
    area:             data.area             || null,
    address:          data.address          || null,
  };

  // 6. Atomic create: User + Vendor in one transaction
  const { vendor } = await vendorRepo.createVendorWithUser(userData, vendorData);
  return vendor;
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
