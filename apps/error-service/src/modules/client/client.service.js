import createError from "http-errors";
import * as clientRepo from "./client.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

export const getClients = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [clients, total] = await Promise.all([
    clientRepo.findMany({ skip, take: limitNum, where }),
    clientRepo.count(where),
  ]);

  return {
    clients,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getClientById = async (id) => {
  const client = await clientRepo.findById(id);
  if (!client) {
    throw createError(404, "Client tidak ditemukan");
  }
  return client;
};

export const createClient = async (data, actorUser = null) => {
  const created = await clientRepo.create(data);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "create",
    deleteAction: "NONE",
    entityType: "Client",
    entityId: created.id,
    details: {
      identifier: created.name,
      changeSummary: `tambah client baru`,
      name: created.name,
      isActive: created.isActive,
    },
  });

  return created;
};

export const updateClient = async (id, data, actorUser = null) => {
  const current = await getClientById(id);
  const updated = await clientRepo.update(id, data);

  const changesStr = Object.keys(data)
    .map((k) => `${k}: ${current[k]} → ${data[k]}`)
    .join(", ");

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "update",
    deleteAction: "NONE",
    entityType: "Client",
    entityId: updated.id,
    details: {
      identifier: updated.name,
      changeSummary: changesStr || "pembaruan data client",
      before: { name: current.name, isActive: current.isActive },
      after: data,
    },
  });

  return updated;
};

export const deleteClient = async (id, actorUser = null) => {
  const client = await getClientById(id);

  // Constraint check: apakah ada yang nyangkut (Asset atau TelegramGroup)?
  const [assetCount, groupCount] = await Promise.all([
    clientRepo.countAssetsByClientId(id),
    clientRepo.countTelegramGroupsByClientId(id),
  ]);

  const hasDependents = assetCount > 0 || groupCount > 0;

  if (hasDependents) {
    // Masih ada yang nyangkut -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE
    const softDeleted = await clientRepo.update(id, { isActive: false });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "delete",
      deleteAction: "SOFT",
      entityType: "Client",
      entityId: id,
      details: {
        identifier: client.name,
        changeSummary: `nonaktifkan (soft delete - terdapat ${assetCount} aset)`,
        reason: `Terdapat ${assetCount} asset dan ${groupCount} grup telegram yang masih terhubung. Entitas dinonaktifkan (Soft Delete).`,
        assetCount,
        groupCount,
      },
    });

    return {
      client: softDeleted,
      deleteAction: "SOFT",
      message: `Client memiliki ${assetCount} asset dan ${groupCount} grup terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> Boleh HARD DELETE
  await clientRepo.deleteById(id);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "delete",
    deleteAction: "HARD",
    entityType: "Client",
    entityId: id,
    details: {
      identifier: client.name,
      changeSummary: "hapus permanen",
      reason: "Tidak ada relasi aktif. Entitas dihapus secara permanen dari basis data.",
      name: client.name,
    },
  });

  return {
    client: { id, name: client.name },
    deleteAction: "HARD",
    message: "Client berhasil dihapus secara permanen (Hard Delete)",
  };
};


