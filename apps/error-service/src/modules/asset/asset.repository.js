import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { createdAt: "desc" } }) => {
  return prisma.asset.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.asset.count({ where });
};

export const findById = async (id) => {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  });
};

export const findByUnitCode = async (unitCode) => {
  return prisma.asset.findUnique({
    where: { unitCode },
  });
};

export const create = async (data) => {
  return prisma.asset.create({
    data,
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const update = async (id, data) => {
  return prisma.asset.update({
    where: { id },
    data,
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const deleteById = async (id) => {
  return prisma.asset.delete({
    where: { id },
  });
};
