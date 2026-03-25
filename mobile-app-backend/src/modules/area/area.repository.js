const prisma = require('../../config/prisma');

const createArea = async (data) => prisma.area.create({ data });

const getAreasList = async ({ page = 1, size = 10, search, status }) => {
  const skip = (page - 1) * size;
  const where = {};
  
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } }
    ];
  }

  const [areas, totalRecords] = await Promise.all([
    prisma.area.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        _count: {
          select: { customers: true }
        }
      }
    }),
    prisma.area.count({ where })
  ]);

  return { areas, totalRecords };
};

const getAreaById = async (id) => prisma.area.findUnique({
  where: { id },
  include: {
    _count: {
      select: { customers: true }
    }
  }
});

const getAreaByName = async (name) => prisma.area.findUnique({
  where: { name }
});

const updateArea = async (id, data) => prisma.area.update({
  where: { id },
  data
});

const softDeleteArea = async (id, updatedBy) => prisma.area.update({
  where: { id },
  data: { status: 'INACTIVE', updatedBy }
});

// Advanced Query: Customers mapped to this specific area with generic search constraints
const getCustomersByAreaId = async (areaId, { page = 1, size = 10, search, status }) => {
  const skip = (page - 1) * size;
  const where = { areaId };

  if (status === 'ACTIVE') where.isActive = true;
  if (status === 'INACTIVE') where.isActive = false;

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } }
    ];
  }

  const [customers, totalRecords] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        ratePerLiter: true,
        morningQuantity: true,
        eveningQuantity: true,
        isActive: true
      }
    }),
    prisma.customer.count({ where })
  ]);

  return { customers, totalRecords };
};

module.exports = {
  createArea,
  getAreasList,
  getAreaById,
  getAreaByName,
  updateArea,
  softDeleteArea,
  getCustomersByAreaId
};
