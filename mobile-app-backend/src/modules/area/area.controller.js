const areaService = require('./area.service');

const createArea = async (req, res, next) => {
  try {
    const area = await areaService.createArea(req.body, req.user?.id);
    res.status(201).json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
};

const getAreas = async (req, res, next) => {
  try {
    const result = await areaService.getAreas(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getArea = async (req, res, next) => {
  try {
    const area = await areaService.getAreaById(req.params.id);
    res.json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
};

const updateArea = async (req, res, next) => {
  try {
    const area = await areaService.updateArea(req.params.id, req.body, req.user?.id);
    res.json({ success: true, message: 'Area updated successfully', data: area });
  } catch (err) {
    next(err);
  }
};

const deleteArea = async (req, res, next) => {
  try {
    const result = await areaService.deleteArea(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getCustomersByArea = async (req, res, next) => {
  try {
    const result = await areaService.getCustomersByArea(req.params.areaId, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createArea,
  getAreas,
  getArea,
  updateArea,
  deleteArea,
  getCustomersByArea
};
