import createError from "http-errors";
import * as assetRepo from "./asset.repository.js";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";

export const getAssets = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.clientId) {
    where.clientId = query.clientId;
  }

  if (query.locationId) {
    where.locationId = query.locationId;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.unitCode = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [assets, total] = await Promise.all([
    assetRepo.findMany({ skip, take: limitNum, where }),
    assetRepo.count(where),
  ]);

  return {
    assets,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getAssetById = async (id) => {
  const asset = await assetRepo.findById(id);
  if (!asset) {
    throw createError(404, "Asset tidak ditemukan");
  }
  return asset;
};

export const createAsset = async (data, actorUser = null) => {
  // Verifikasi Client ada
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });
  if (!client) {
    throw createError(404, "Client tidak ditemukan");
  }

  // Verifikasi Location ada
  const location = await prisma.location.findUnique({
    where: { id: data.locationId },
  });
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }

  // Verifikasi keunikan unitCode
  const existing = await assetRepo.findByUnitCode(data.unitCode);
  if (existing) {
    throw createError(409, `Unit code '${data.unitCode}' sudah terdaftar`);
  }

  const formattedData = {
    ...data,
    commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : null,
  };

  const created = await assetRepo.create(formattedData);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "create",
    deleteAction: "NONE",
    entityType: "Asset",
    entityId: created.id,
    details: {
      identifier: created.unitCode,
      changeSummary: `tambah asset baru`,
      unitCode: created.unitCode,
      type: created.type,
      status: created.status,
    },
  });

  return created;
};

export const updateAsset = async (id, data, actorUser = null) => {
  const current = await getAssetById(id);

  if (data.clientId && data.clientId !== current.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      throw createError(404, "Client tidak ditemukan");
    }
  }

  let locationNameChange = null;
  if (data.locationId && data.locationId !== current.locationId) {
    const newLocation = await prisma.location.findUnique({
      where: { id: data.locationId },
    });
    if (!newLocation) {
      throw createError(404, "Lokasi tidak ditemukan");
    }
    locationNameChange = `lokasi: ${current.location?.name || 'Lama'} → ${newLocation.name}`;
  }

  if (data.unitCode && data.unitCode !== current.unitCode) {
    const existing = await assetRepo.findByUnitCode(data.unitCode);
    if (existing && existing.id !== id) {
      throw createError(409, `Unit code '${data.unitCode}' sudah terdaftar`);
    }
  }

  const formattedData = { ...data };
  if (data.commissioningDate !== undefined) {
    formattedData.commissioningDate = data.commissioningDate
      ? new Date(data.commissioningDate)
      : null;
  }

  const updated = await assetRepo.update(id, formattedData);

  let changeSummary = locationNameChange;
  if (!changeSummary) {
    changeSummary = Object.keys(data)
      .map((k) => `${k}: ${current[k]} → ${data[k]}`)
      .join(", ");
  }

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "update",
    deleteAction: "NONE",
    entityType: "Asset",
    entityId: updated.id,
    details: {
      identifier: updated.unitCode,
      changeSummary: changeSummary || "pembaruan data asset",
      before: { unitCode: current.unitCode, status: current.status },
      after: formattedData,
    },
  });

  return updated;
};

export const deleteAsset = async (id, actorUser = null) => {
  const asset = await getAssetById(id);

  // Constraint check: apakah ada tiket yang nyangkut menggunakan unitCode asset ini?
  const ticketCount = await assetRepo.countTicketsByUnitCode(asset.unitCode);

  if (ticketCount > 0) {
    // Masih ada tiket yang terhubung -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE (nonaktifkan & RETIRED)
    const softDeleted = await assetRepo.update(id, { isActive: false, status: "RETIRED" });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "delete",
      deleteAction: "SOFT",
      entityType: "Asset",
      entityId: id,
      details: {
        identifier: asset.unitCode,
        changeSummary: `nonaktifkan & RETIRED (terdapat ${ticketCount} tiket)`,
        reason: `Terdapat ${ticketCount} tiket yang terhubung dengan unit code '${asset.unitCode}'. Entitas dinonaktifkan & status diubah menjadi RETIRED (Soft Delete).`,
        ticketCount,
        unitCode: asset.unitCode,
      },
    });

    return {
      asset: softDeleted,
      deleteAction: "SOFT",
      message: `Asset memiliki ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete & RETIRED).`,
    };
  }

  // Tidak ada tiket yang nyangkut -> Boleh HARD DELETE
  await assetRepo.deleteById(id);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "delete",
    deleteAction: "HARD",
    entityType: "Asset",
    entityId: id,
    details: {
      identifier: asset.unitCode,
      changeSummary: "hapus permanen",
      reason: "Tidak ada tiket terhubung. Entitas dihapus secara permanen dari basis data.",
      unitCode: asset.unitCode,
    },
  });

  return {
    asset: { id, unitCode: asset.unitCode },
    deleteAction: "HARD",
    message: "Asset berhasil dihapus secara permanen (Hard Delete)",
  };
};


