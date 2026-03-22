const prisma = require('../config/prisma');

const createCompany = async (data) => prisma.company.create({ data });

const findAllCompanies = async ({ page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  return prisma.company.findMany({
    skip,
    take: limit,
    include: { _count: { select: { vendors: true } } },
  });
};

const findCompanyById = async (id) => prisma.company.findUnique({
  where: { id },
  include: { vendors: true },
});

const companyExists = async (name) => prisma.company.findFirst({
  where: { name },
});

module.exports = { createCompany, findAllCompanies, findCompanyById, companyExists };
