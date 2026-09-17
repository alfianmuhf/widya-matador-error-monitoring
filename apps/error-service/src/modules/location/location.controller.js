import * as locationService from "./location.service.js";

export const getLocations = async (req, res, next) => {
  try {
    const result = await locationService.getLocations(req.query);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil daftar lokasi",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getLocationById = async (req, res, next) => {
  try {
    const location = await locationService.getLocationById(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail lokasi",
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req, res, next) => {
  try {
    const location = await locationService.createLocation(req.body);
    res.status(201).json({
      status: "success",
      message: "Lokasi berhasil ditambahkan",
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const location = await locationService.updateLocation(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Lokasi berhasil diperbarui",
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req, res, next) => {
  try {
    await locationService.deleteLocation(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Lokasi berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};
