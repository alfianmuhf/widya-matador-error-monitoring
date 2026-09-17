import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { name: "asc" } }) => {
  return prisma.client.findMany({
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
  return prisma.client.count({ where });
};

export const findById = async (id) => {
  return prisma.client.findUnique({
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
  return prisma.client.create({ data });
};

export const update = async (id, data) => {
  return prisma.client.update({
    where: { id },
    data,
  });
};

export const deleteById = async (id) => {
  return prisma.client.delete({
    where: { id },
  });
};

export const countAssetsByClientId = async (clientId) => {
  return prisma.asset.count({
    where: { clientId },
  });
};
