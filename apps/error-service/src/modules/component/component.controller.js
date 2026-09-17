import * as componentService from "./component.service.js";

export const getComponents = async (req, res, next) => {
  try {
    const result = await componentService.getComponents(req.query);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil daftar komponen",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getComponentById = async (req, res, next) => {
  try {
    const component = await componentService.getComponentById(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail komponen",
      data: { component },
    });
  } catch (error) {
    next(error);
  }
};

export const createComponent = async (req, res, next) => {
  try {
    const component = await componentService.createComponent(req.body);
    res.status(201).json({
      status: "success",
      message: "Komponen berhasil ditambahkan",
      data: { component },
    });
  } catch (error) {
    next(error);
  }
};

export const updateComponent = async (req, res, next) => {
  try {
    const component = await componentService.updateComponent(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      message: "Komponen berhasil diperbarui",
      data: { component },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComponent = async (req, res, next) => {
  try {
    await componentService.deleteComponent(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Komponen berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};
