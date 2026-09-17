import createError from "http-errors";
import * as locationRepo from "./location.repository.js";

export const getLocations = async (query = {}) => {
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

  const [locations, total] = await Promise.all([
    locationRepo.findMany({ skip, take: limitNum, where }),
    locationRepo.count(where),
  ]);

  return {
    locations,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getLocationById = async (id) => {
  const location = await locationRepo.findById(id);
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }
  return location;
};

export const createLocation = async (data) => {
  return locationRepo.create(data);
};

export const updateLocation = async (id, data) => {
  await getLocationById(id);
  return locationRepo.update(id, data);
};

export const deleteLocation = async (id) => {
  await getLocationById(id);

  // Constraint Foreign Key check: Asset referencing Location
  const assetCount = await locationRepo.countAssetsByLocationId(id);
  if (assetCount > 0) {
    throw createError(
      400,
      `Tidak dapat menghapus lokasi karena masih terdapat ${assetCount} asset yang terhubung. Hapus atau pindahkan asset terlebih dahulu.`
    );
  }

  return locationRepo.deleteById(id);
};
