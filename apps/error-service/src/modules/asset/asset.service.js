import createError from "http-errors";
import * as assetRepo from "./asset.repository.js";
import prisma from "../../config/prisma.js";

export const getAssets = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.clientId) {
    where.clientId = query.clientId;
  }

  if (query.locationId) {
    where.locationId = query.locationId;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.unitCode = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [assets, total] = await Promise.all([
    assetRepo.findMany({ skip, take: limitNum, where }),
    assetRepo.count(where),
  ]);

  return {
    assets,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
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
