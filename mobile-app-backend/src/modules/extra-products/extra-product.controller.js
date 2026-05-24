'use strict';

const service = require('./extra-product.service');

const addExtraProduct = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const result = await service.addExtraProduct(req.body, vendorId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateExtraProduct = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const result = await service.updateExtraProduct(req.params.id, req.body, vendorId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteExtraProduct = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const result = await service.deleteExtraProduct(req.params.id, vendorId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getExtraProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { customerId, month, year } = req.query;
    const result = await service.getExtraProducts(
      customerId,
      parseInt(month, 10),
      parseInt(year, 10),
      vendorId
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addExtraProduct,
  updateExtraProduct,
  deleteExtraProduct,
  getExtraProducts,
};
