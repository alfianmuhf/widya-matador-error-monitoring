import createError from "http-errors";
import * as clientRepo from "./client.repository.js";

export const getClients = async (query) => {
  const { page = 1, limit = 10, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  const [clients, total] = await Promise.all([
    clientRepo.findMany({ skip, take: limit, where }),
    clientRepo.count(where),
  ]);

  return {
    clients,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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
