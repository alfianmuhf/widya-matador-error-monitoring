import createError from "http-errors";
import * as assetRepo from "./asset.repository.js";
import prisma from "../../config/prisma.js";

export const getAssets = async (query) => {
  const { page = 1, limit = 10, clientId, locationId, type, status, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {};

  if (clientId) {
    where.clientId = clientId;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.unitCode = { contains: search, mode: "insensitive" };
  }

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  const [assets, total] = await Promise.all([
    assetRepo.findMany({ skip, take: limit, where }),
    assetRepo.count(where),
  ]);

  return {
    assets,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getAssetById = async (id) => {
  const asset = await assetRepo.findById(id);
  if (!asset) {
    throw createError(404, "Asset tidak ditemukan");
  }
  return asset;
};

export const createAsset = async (data) => {
  // Verifikasi Client ada
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });
  if (!client) {
    throw createError(404, "Client tidak ditemukan");
  }

  // Verifikasi Location ada
  const location = await prisma.location.findUnique({
    where: { id: data.locationId },
  });
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }

  // Verifikasi keunikan unitCode
  const existing = await assetRepo.findByUnitCode(data.unitCode);
  if (existing) {
    throw createError(409, `Unit code '${data.unitCode}' sudah terdaftar`);
  }

  const formattedData = {
    ...data,
    commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : null,
  };

  return assetRepo.create(formattedData);
};

export const updateAsset = async (id, data) => {
  const current = await getAssetById(id);

  if (data.clientId && data.clientId !== current.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      throw createError(404, "Client tidak ditemukan");
    }
  }

  if (data.locationId && data.locationId !== current.locationId) {
    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
    });
    if (!location) {
      throw createError(404, "Lokasi tidak ditemukan");
    }
  }

  if (data.unitCode && data.unitCode !== current.unitCode) {
    const existing = await assetRepo.findByUnitCode(data.unitCode);
    if (existing && existing.id !== id) {
      throw createError(409, `Unit code '${data.unitCode}' sudah terdaftar`);
    }
  }

  const formattedData = { ...data };
  if (data.commissioningDate !== undefined) {
    formattedData.commissioningDate = data.commissioningDate
      ? new Date(data.commissioningDate)
      : null;
  }

  return assetRepo.update(id, formattedData);
};

export const deleteAsset = async (id) => {
  await getAssetById(id);
  return assetRepo.deleteById(id);
};
