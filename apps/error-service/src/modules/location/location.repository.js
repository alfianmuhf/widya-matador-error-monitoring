import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { name: "asc" } }) => {
  return prisma.locations.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.locations.count({ where });
};

export const findById = async (id) => {
  return prisma.locations.findUnique({
    where: { id },
    include: {
      _count: {
        select: { assets: true },
      },
      assets: {
        select: {
          id: true,
          unit_code: true,
          asset_type: true,
          status: true,
          is_active: true,
        },
      },
    },
  });
};

export const create = async (data) => {
  return prisma.locations.create({
    data: {
      name: data.name,
      is_active: data.is_active ?? data.isActive ?? true,
    },
  });
};

export const update = async (id, data) => {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  return prisma.locations.update({
    where: { id },
    data: updateData,
  });
};

export const deleteById = async (id) => {
  return prisma.locations.delete({
    where: { id },
  });
};

export const countAssetsByLocationId = async (locationId) => {
  return prisma.assets.count({
    where: { location_id: locationId },
  });
};

export const countTelegramGroupsByLocationId = async (locationId) => {
  return prisma.telegram_groups.count({
    where: { location_id: locationId },
  });
};
