import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { name: "asc" } }) => {
  return prisma.location.findMany({
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
  return prisma.location.count({ where });
};

export const findById = async (id) => {
  return prisma.location.findUnique({
    where: { id },
    include: {
      _count: {
        select: { assets: true },
      },
      assets: {
        select: {
          id: true,
          unitCode: true,
          type: true,
          status: true,
          isActive: true,
        },
      },
    },
  });
};

export const create = async (data) => {
  return prisma.location.create({ data });
};

export const update = async (id, data) => {
  return prisma.location.update({
    where: { id },
    data,
  });
};

export const deleteById = async (id) => {
  return prisma.location.delete({
    where: { id },
  });
};

export const countAssetsByLocationId = async (locationId) => {
  return prisma.asset.count({
    where: { locationId },
  });
};

export const countTelegramGroupsByLocationId = async (locationId) => {
  return prisma.telegramGroup.count({
    where: { locationId },
  });
};

