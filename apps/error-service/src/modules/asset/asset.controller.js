import * as assetService from "./asset.service.js";

export const getAssets = async (req, res, next) => {
  try {
    const result = await assetService.getAssets(req.query);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil daftar asset",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const asset = await assetService.getAssetById(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail asset",
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json({
      status: "success",
      message: "Asset berhasil ditambahkan",
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const asset = await assetService.updateAsset(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Asset berhasil diperbarui",
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    await assetService.deleteAsset(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Asset berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};
