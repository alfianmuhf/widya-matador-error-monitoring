import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = [{ code: "asc" }] }) => {
  return prisma.failureCode.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
        },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.failureCode.count({ where });
};

export const findById = async (id) => {
  return prisma.failureCode.findUnique({
    where: { id },
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
          sortOrder: true,
        },
      },
    },
  });
};

export const findByCode = async (code) => {
  return prisma.failureCode.findUnique({
    where: { code },
  });
};

export const create = async (data) => {
  return prisma.failureCode.create({
    data,
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
        },
      },
    },
  });
};

export const update = async (id, data) => {
  return prisma.failureCode.update({
    where: { id },
    data,
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
        },
      },
    },
  });
};

export const deleteById = async (id) => {
  return prisma.failureCode.delete({
    where: { id },
  });
};

export const countTicketsByFailureCodeId = async (failureCodeId) => {
  return prisma.ticket.count({
    where: { failureCodeId },
  });
};

