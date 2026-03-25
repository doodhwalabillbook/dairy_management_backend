const areaRepository = require('./area.repository');

const createArea = async (payload, userId) => {
  const duplicate = await areaRepository.getAreaByName(payload.name);
  if (duplicate) {
    const error = new Error('Area name already exists');
    error.statusCode = 409;
    throw error;
  }

  return areaRepository.createArea({
    ...payload,
    createdBy: userId,
    updatedBy: userId
  });
};

const getAreas = async (queryParams) => {
  const result = await areaRepository.getAreasList(queryParams);
  return {
    data: result.areas,
    pagination: {
      page: queryParams.page,
      size: queryParams.size,
      totalRecords: result.totalRecords
    }
  };
};

const getAreaById = async (areaId) => {
  const area = await areaRepository.getAreaById(areaId);
  if (!area) {
    const error = new Error('Area not found');
    error.statusCode = 404;
    throw error;
  }
  return area;
};

const updateArea = async (areaId, payload, userId) => {
  const existingArea = await areaRepository.getAreaById(areaId);
  if (!existingArea) {
    const error = new Error('Area not found');
    error.statusCode = 404;
    throw error;
  }

  if (payload.name && payload.name !== existingArea.name) {
    const duplicate = await areaRepository.getAreaByName(payload.name);
    if (duplicate) {
      const error = new Error('Area name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  return areaRepository.updateArea(areaId, { ...payload, updatedBy: userId });
};

const deleteArea = async (areaId, userId) => {
  const existingArea = await areaRepository.getAreaById(areaId);
  if (!existingArea) {
    const error = new Error('Area not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Optional but recommended rule: prevent deletion if holding active customers.
  if (existingArea._count && existingArea._count.customers > 0) {
    const error = new Error('Cannot delete area containing customers');
    error.statusCode = 400;
    throw error;
  }

  await areaRepository.softDeleteArea(areaId, userId);
  return { success: true, message: 'Area deactivated successfully' };
};

const getCustomersByArea = async (areaId, queryParams) => {
  const area = await areaRepository.getAreaById(areaId);
  if (!area) {
    const error = new Error('Area not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await areaRepository.getCustomersByAreaId(areaId, queryParams);
  
  // Maps strictly to prompt required signature exactly
  return {
    area: {
      areaId: area.id,
      name: area.name
    },
    customers: result.customers.map(c => ({
      customerId: c.id,
      name: c.name,
      mobileNumber: c.phone, // alias for standard mapping compatibility requirement
      address: c.address,
      ratePerLiter: c.ratePerLiter,
      morningQuantity: c.morningQuantity,
      eveningQuantity: c.eveningQuantity,
      isActive: c.isActive
    })),
    pagination: {
      page: queryParams.page,
      size: queryParams.size,
      totalRecords: result.totalRecords
    }
  };
};

module.exports = {
  createArea,
  getAreas,
  getAreaById,
  updateArea,
  deleteArea,
  getCustomersByArea
};
