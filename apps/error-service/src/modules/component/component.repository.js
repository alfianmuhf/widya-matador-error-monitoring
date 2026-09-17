import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = [{ sortOrder: "asc" }, { name: "asc" }] }) => {
  return prisma.component.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      _count: {
        select: { failureCodes: true },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.component.count({ where });
};

export const findById = async (id) => {
  return prisma.component.findUnique({
    where: { id },
    include: {
      _count: {
        select: { failureCodes: true },
      },
      failureCodes: {
        select: {
          id: true,
          code: true,
          description: true,
          isActive: true,
        },
      },
    },
  });
};

export const create = async (data) => {
  return prisma.component.create({ data });
};

export const update = async (id, data) => {
  return prisma.component.update({
    where: { id },
    data,
  });
};

export const deleteById = async (id) => {
  return prisma.component.delete({
    where: { id },
  });
};

export const countFailureCodesByComponentId = async (componentId) => {
  return prisma.failureCode.count({
    where: { componentId },
  });
};
