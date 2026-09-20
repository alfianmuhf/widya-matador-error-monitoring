import * as failureCodeService from "./failure-code.service.js";

export const getFailureCodes = async (req, res, next) => {
  try {
    const result = await failureCodeService.getFailureCodes(req.query);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil daftar failure code",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getFailureCodeById = async (req, res, next) => {
  try {
    const failureCode = await failureCodeService.getFailureCodeById(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail failure code",
      data: { failureCode },
    });
  } catch (error) {
    next(error);
  }
};

export const createFailureCode = async (req, res, next) => {
  try {
    const failureCode = await failureCodeService.createFailureCode(req.body, req.user);
    res.status(201).json({
      status: "success",
      message: "Failure code berhasil ditambahkan",
      data: { failureCode },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFailureCode = async (req, res, next) => {
  try {
    const failureCode = await failureCodeService.updateFailureCode(req.params.id, req.body, req.user);
    res.status(200).json({
      status: "success",
      message: "Failure code berhasil diperbarui",
      data: { failureCode },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFailureCode = async (req, res, next) => {
  try {
    const result = await failureCodeService.deleteFailureCode(req.params.id, req.user);
    res.status(200).json({
      status: "success",
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

