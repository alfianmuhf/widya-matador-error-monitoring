import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = [{ code: "asc" }] }) => {
  return prisma.failure_codes.findMany({
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
  return prisma.failure_codes.count({ where });
};

export const findById = async (id) => {
  return prisma.failure_codes.findUnique({
    where: { id },
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
          sort_order: true,
        },
      },
    },
  });
};

export const findByCode = async (code) => {
  return prisma.failure_codes.findFirst({
    where: { code },
  });
};

export const findByComponentAndCode = async (componentId, code) => {
  return prisma.failure_codes.findUnique({
    where: {
      component_id_code: {
        component_id: componentId,
        code,
      },
    },
  });
};

export const create = async (data) => {
  return prisma.failure_codes.create({
    data: {
      component_id: data.component_id || data.componentId,
      code: data.code,
      name: data.name || null,
      description: data.description || null,
      is_active: data.is_active ?? data.isActive ?? true,
    },
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
  const updateData = {};
  if (data.component_id !== undefined) updateData.component_id = data.component_id;
  if (data.componentId !== undefined) updateData.component_id = data.componentId;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  return prisma.failure_codes.update({
    where: { id },
    data: updateData,
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
  return prisma.failure_codes.delete({
    where: { id },
  });
};

export const countTicketsByFailureCodeId = async (failureCodeId) => {
  return prisma.tickets.count({
    where: { failure_code_id: failureCodeId },
  });
};
