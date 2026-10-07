import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = [{ sort_order: "asc" }, { name: "asc" }] }) => {
  return prisma.components.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      _count: {
        select: { failure_codes: true },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.components.count({ where });
};

export const findById = async (id) => {
  return prisma.components.findUnique({
    where: { id },
    include: {
      _count: {
        select: { failure_codes: true },
      },
      failure_codes: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          is_active: true,
        },
      },
    },
  });
};

export const create = async (data) => {
  return prisma.components.create({
    data: {
      prefix: data.prefix,
      name: data.name,
      sort_order: data.sort_order ?? data.sortOrder ?? 0,
      is_active: data.is_active ?? data.isActive ?? true,
    },
  });
};

export const update = async (id, data) => {
  const updateData = {};
  if (data.prefix !== undefined) updateData.prefix = data.prefix;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  return prisma.components.update({
    where: { id },
    data: updateData,
  });
};

export const deleteById = async (id) => {
  return prisma.components.delete({
    where: { id },
  });
};

export const countFailureCodesByComponentId = async (componentId) => {
  return prisma.failure_codes.count({
    where: { component_id: componentId },
  });
};

export const countTicketsByComponentId = async (componentId) => {
  return prisma.tickets.count({
    where: { failure_code: { component_id: componentId } },
  });
};
