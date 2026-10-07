import prisma from "../../config/prisma.js";

export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { unit_code: "asc" } }) => {
  return prisma.assets.findMany({
    skip,
    take,
    where,
    orderBy,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
    },
  });
};

export const count = async (where = {}) => {
  return prisma.assets.count({ where });
};

export const findById = async (id) => {
  return prisma.assets.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
    },
  });
};

export const findByUnitCode = async (unitCode) => {
  return prisma.assets.findUnique({
    where: { unit_code: unitCode },
  });
};

export const create = async (data) => {
  return prisma.assets.create({
    data: {
      unit_code: data.unit_code || data.unitCode,
      asset_type: data.asset_type || data.type || "portable",
      client_id: data.client_id || data.clientId,
      location_id: data.location_id || data.locationId,
      status: data.status || "active",
      commissioning_date: data.commissioning_date || data.commissioningDate || null,
      is_active: data.is_active ?? data.isActive ?? true,
    },
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
  const updateData = {};
  if (data.unit_code !== undefined) updateData.unit_code = data.unit_code;
  if (data.unitCode !== undefined) updateData.unit_code = data.unitCode;
  if (data.asset_type !== undefined) updateData.asset_type = data.asset_type;
  if (data.type !== undefined) updateData.asset_type = data.type;
  if (data.client_id !== undefined) updateData.client_id = data.client_id;
  if (data.clientId !== undefined) updateData.client_id = data.clientId;
  if (data.location_id !== undefined) updateData.location_id = data.location_id;
  if (data.locationId !== undefined) updateData.location_id = data.locationId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.commissioning_date !== undefined) updateData.commissioning_date = data.commissioning_date;
  if (data.commissioningDate !== undefined) updateData.commissioning_date = data.commissioningDate;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  return prisma.assets.update({
    where: { id },
    data: updateData,
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
  return prisma.assets.delete({
    where: { id },
  });
};

export const countTicketsByAssetId = async (assetId) => {
  return prisma.tickets.count({
    where: { asset_id: assetId },
  });
};

export const countTicketsByUnitCode = async (unitCode) => {
  return prisma.tickets.count({
    where: { asset: { unit_code: unitCode } },
  });
};
