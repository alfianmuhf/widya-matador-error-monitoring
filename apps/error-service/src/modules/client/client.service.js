import createError from "http-errors";
import * as clientRepo from "./client.repository.js";

export const getClients = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [clients, total] = await Promise.all([
    clientRepo.findMany({ skip, take: limitNum, where }),
    clientRepo.count(where),
  ]);

  return {
    clients,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getClientById = async (id) => {
  const client = await clientRepo.findById(id);
  if (!client) {
    throw createError(404, "Client tidak ditemukan");
  }
  return client;
};

export const createClient = async (data) => {
  return clientRepo.create(data);
};

export const updateClient = async (id, data) => {
  await getClientById(id);
  return clientRepo.update(id, data);
};

export const deleteClient = async (id) => {
  await getClientById(id);

  // Constraint Foreign Key check: Asset referencing Client
  const assetCount = await clientRepo.countAssetsByClientId(id);
  if (assetCount > 0) {
    throw createError(
      400,
      `Tidak dapat menghapus client karena masih terdapat ${assetCount} asset yang terhubung. Hapus atau pindahkan asset terlebih dahulu.`
    );
  }

  return clientRepo.deleteById(id);
};
