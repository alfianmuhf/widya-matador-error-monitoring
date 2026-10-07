import createError from "http-errors";
import * as locationRepo from "./location.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const formatLocation = (loc) => {
  if (!loc) return null;
  return {
    id: loc.id,
    name: loc.name,
    isActive: loc.is_active,
    is_active: loc.is_active,
    createdAt: loc.created_at,
    created_at: loc.created_at,
    updatedAt: loc.updated_at,
    updated_at: loc.updated_at,
    _count: loc._count,
    assets: loc.assets ? loc.assets.map(a => ({
      id: a.id,
      unitCode: a.unit_code,
      unit_code: a.unit_code,
      type: a.asset_type,
      asset_type: a.asset_type,
      status: a.status,
      isActive: a.is_active,
      is_active: a.is_active,
    })) : undefined,
  };
};

export const getLocations = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.is_active = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.is_active = false;
  }

  const [locations, total] = await Promise.all([
    locationRepo.findMany({ skip, take: limitNum, where }),
    locationRepo.count(where),
  ]);

  return {
    locations: locations.map(formatLocation),
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getLocationById = async (id) => {
  const location = await locationRepo.findById(id);
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }
  return formatLocation(location);
};

export const createLocation = async (data, actorUser = null) => {
  const created = await locationRepo.create(data);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "Location",
    entityId: created.id,
    details: {
      identifier: created.name,
      name: created.name,
      isActive: created.is_active,
      changeSummary: `tambah lokasi '${created.name}'`,
    },
  });

  return formatLocation(created);
};

export const updateLocation = async (id, data, actorUser = null) => {
  const current = await locationRepo.findById(id);
  if (!current) {
    throw createError(404, "Lokasi tidak ditemukan");
  }
  const updated = await locationRepo.update(id, data);

  const changes = [];
  if (data.name !== undefined && data.name !== current.name) {
    changes.push(`nama: ${current.name} → ${data.name}`);
  }
  if (data.is_active !== undefined && data.is_active !== current.is_active) {
    changes.push(`is_active: ${current.is_active} → ${data.is_active}`);
  }
  if (data.isActive !== undefined && data.isActive !== current.is_active) {
    changes.push(`is_active: ${current.is_active} → ${data.isActive}`);
  }
  const changeSummary = changes.length > 0 ? changes.join(", ") : "perubahan data lokasi";

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "Location",
    entityId: updated.id,
    details: {
      identifier: updated.name,
      changeSummary,
      before: { name: current.name, isActive: current.is_active },
      after: data,
    },
  });

  return formatLocation(updated);
};

export const deleteLocation = async (id, actorUser = null) => {
  const location = await locationRepo.findById(id);
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }

  // Constraint check: apakah ada yang nyangkut (Asset atau TelegramGroup)?
  const [assetCount, groupCount] = await Promise.all([
    locationRepo.countAssetsByLocationId(id),
    locationRepo.countTelegramGroupsByLocationId(id),
  ]);

  const hasDependents = assetCount > 0 || groupCount > 0;

  if (hasDependents) {
    // Masih ada yang nyangkut -> SOFT DELETE
    const softDeleted = await locationRepo.update(id, { is_active: false });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "DELETE",
      deleteAction: "SOFT",
      entityType: "Location",
      entityId: id,
      details: {
        identifier: location.name,
        changeSummary: `soft delete: dinonaktifkan (${assetCount} aset, ${groupCount} grup terikat)`,
        reason: `Terdapat ${assetCount} asset dan ${groupCount} grup telegram yang masih terhubung. Entitas dinonaktifkan (Soft Delete).`,
        assetCount,
        groupCount,
      },
    });

    return {
      location: formatLocation(softDeleted),
      deleteAction: "SOFT",
      message: `Lokasi memiliki ${assetCount} asset dan ${groupCount} grup terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> HARD DELETE
  await locationRepo.deleteById(id);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "DELETE",
    deleteAction: "HARD",
    entityType: "Location",
    entityId: id,
    details: {
      identifier: location.name,
      changeSummary: `hapus permanen lokasi '${location.name}'`,
      reason: "Tidak ada relasi aktif. Entitas dihapus secara permanen dari basis data.",
      name: location.name,
    },
  });

  return {
    location: { id, name: location.name },
    deleteAction: "HARD",
    message: "Lokasi berhasil dihapus secara permanen (Hard Delete)",
  };
};
