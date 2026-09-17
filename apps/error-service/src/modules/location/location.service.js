import createError from "http-errors";
import * as locationRepo from "./location.repository.js";

export const getLocations = async (query) => {
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

  const [locations, total] = await Promise.all([
    locationRepo.findMany({ skip, take: limit, where }),
    locationRepo.count(where),
  ]);

  return {
    locations,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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
