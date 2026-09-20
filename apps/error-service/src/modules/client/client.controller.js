import * as clientService from "./client.service.js";

export const getClients = async (req, res, next) => {
  try {
    const result = await clientService.getClients(req.query);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil daftar client",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail client",
      data: { client },
    });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient(req.body, req.user);
    res.status(201).json({
      status: "success",
      message: "Client berhasil ditambahkan",
      data: { client },
    });
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body, req.user);
    res.status(200).json({
      status: "success",
      message: "Client berhasil diperbarui",
      data: { client },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const result = await clientService.deleteClient(req.params.id, req.user);
    res.status(200).json({
      status: "success",
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

