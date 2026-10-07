import createError from "http-errors";
import * as assetRepo from "./asset.repository.js";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const formatAsset = (a) => {
  if (!a) return null;
  return {
    id: a.id,
    unitCode: a.unit_code,
    unit_code: a.unit_code,
    type: a.asset_type,
    asset_type: a.asset_type,
    clientId: a.client_id,
    client_id: a.client_id,
    locationId: a.location_id,
    location_id: a.location_id,
    status: a.status,
    commissioningDate: a.commissioning_date,
    commissioning_date: a.commissioning_date,
    isActive: a.is_active,
    is_active: a.is_active,
    createdAt: a.created_at,
    created_at: a.created_at,
    updatedAt: a.updated_at,
    updated_at: a.updated_at,
    client: a.client ? {
      id: a.client.id,
      name: a.client.name,
      isActive: a.client.is_active,
      is_active: a.client.is_active,
    } : undefined,
    location: a.location ? {
      id: a.location.id,
      name: a.location.name,
      isActive: a.location.is_active,
      is_active: a.location.is_active,
    } : undefined,
  };
};

export const getAssets = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.clientId || query.client_id) {
    where.client_id = query.clientId || query.client_id;
  }

  if (query.locationId || query.location_id) {
    where.location_id = query.locationId || query.location_id;
  }

  if (query.type || query.asset_type) {
    where.asset_type = normalizeAssetType(query.type || query.asset_type);
  }

  if (query.status) {
    where.status = normalizeAssetStatus(query.status);
  }

  if (query.search) {
    where.unit_code = { contains: query.search, mode: "insensitive" };
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.is_active = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.is_active = false;
  }

  const [assets, total] = await Promise.all([
    assetRepo.findMany({ skip, take: limitNum, where }),
    assetRepo.count(where),
  ]);

  return {
    assets: assets.map(formatAsset),
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
  return formatAsset(asset);
};

const normalizeAssetType = (type) => {
  if (!type) return "portable";
  const lower = String(type).trim().toLowerCase();
  if (lower === "static") return "static";
  return "portable";
};

const normalizeAssetStatus = (status) => {
  if (!status) return "active";
  const lower = String(status).trim().toLowerCase();
  if (lower === "operational" || lower === "active") return "active";
  if (lower === "maintenance") return "maintenance";
  if (lower === "decommissioned" || lower === "retired" || lower === "nonoperational" || lower === "inactive") return "retired";
  return "active";
};

export const createAsset = async (data, actorUser = null) => {
  const clientId = data.clientId || data.client_id;
  const locationId = data.locationId || data.location_id;
  const unitCode = data.unitCode || data.unit_code;

  // Verifikasi Client ada
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    throw createError(404, "Client tidak ditemukan");
  }

  // Verifikasi Location ada
  const location = await prisma.locations.findUnique({
    where: { id: locationId },
  });
  if (!location) {
    throw createError(404, "Lokasi tidak ditemukan");
  }

  // Verifikasi keunikan unitCode
  const existing = await assetRepo.findByUnitCode(unitCode);
  if (existing) {
    throw createError(409, `Unit code '${unitCode}' sudah terdaftar`);
  }

  const formattedData = {
    unit_code: unitCode,
    asset_type: normalizeAssetType(data.type || data.asset_type),
    client_id: clientId,
    location_id: locationId,
    status: normalizeAssetStatus(data.status),
    commissioning_date: (data.commissioningDate || data.commissioning_date)
      ? new Date(data.commissioningDate || data.commissioning_date)
      : null,
    is_active: data.isActive ?? data.is_active ?? true,
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
      identifier: created.unit_code,
      changeSummary: `tambah asset baru '${created.unit_code}'`,
      unitCode: created.unit_code,
      type: created.asset_type,
      status: created.status,
    },
  });

  return formatAsset(created);
};

export const updateAsset = async (id, data, actorUser = null) => {
  const current = await assetRepo.findById(id);
  if (!current) {
    throw createError(404, "Asset tidak ditemukan");
  }

  const clientId = data.clientId || data.client_id;
  if (clientId && clientId !== current.client_id) {
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw createError(404, "Client tidak ditemukan");
    }
  }

  let locationNameChange = null;
  const locationId = data.locationId || data.location_id;
  if (locationId && locationId !== current.location_id) {
    const newLocation = await prisma.locations.findUnique({
      where: { id: locationId },
    });
    if (!newLocation) {
      throw createError(404, "Lokasi tidak ditemukan");
    }
    locationNameChange = `lokasi: ${current.location?.name || 'Lama'} → ${newLocation.name}`;
  }

  const unitCode = data.unitCode || data.unit_code;
  if (unitCode && unitCode !== current.unit_code) {
    const existing = await assetRepo.findByUnitCode(unitCode);
    if (existing && existing.id !== id) {
      throw createError(409, `Unit code '${unitCode}' sudah terdaftar`);
    }
  }

  const formattedData = {};
  if (unitCode !== undefined) formattedData.unit_code = unitCode;
  if (data.type !== undefined || data.asset_type !== undefined) {
    formattedData.asset_type = normalizeAssetType(data.type || data.asset_type);
  }
  if (clientId !== undefined) formattedData.client_id = clientId;
  if (locationId !== undefined) formattedData.location_id = locationId;
  if (data.status !== undefined) {
    formattedData.status = normalizeAssetStatus(data.status);
  }
  if (data.commissioningDate !== undefined || data.commissioning_date !== undefined) {
    const commDate = data.commissioningDate || data.commissioning_date;
    formattedData.commissioning_date = commDate ? new Date(commDate) : null;
  }
  if (data.isActive !== undefined || data.is_active !== undefined) {
    formattedData.is_active = data.isActive ?? data.is_active;
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
      identifier: updated.unit_code,
      changeSummary: changeSummary || "pembaruan data asset",
      before: { unitCode: current.unit_code, status: current.status },
      after: formattedData,
    },
  });

  return formatAsset(updated);
};

export const deleteAsset = async (id, actorUser = null) => {
  const asset = await assetRepo.findById(id);
  if (!asset) {
    throw createError(404, "Asset tidak ditemukan");
  }

  // Constraint check: apakah ada tiket yang nyangkut menggunakan asset ini?
  const ticketCount = await assetRepo.countTicketsByAssetId(id);

  if (ticketCount > 0) {
    // Masih ada tiket yang terhubung -> SOFT DELETE (nonaktifkan & RETIRED)
    const softDeleted = await assetRepo.update(id, { is_active: false, status: "retired" });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "delete",
      deleteAction: "SOFT",
      entityType: "Asset",
      entityId: id,
      details: {
        identifier: asset.unit_code,
        changeSummary: `nonaktifkan & retired (terdapat ${ticketCount} tiket)`,
        reason: `Terdapat ${ticketCount} tiket yang terhubung dengan unit code '${asset.unit_code}'. Entitas dinonaktifkan & status diubah menjadi retired (Soft Delete).`,
        ticketCount,
        unitCode: asset.unit_code,
      },
    });

    return {
      asset: formatAsset(softDeleted),
      deleteAction: "SOFT",
      message: `Asset memiliki ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete & retired).`,
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
      identifier: asset.unit_code,
      changeSummary: "hapus permanen",
      reason: "Tidak ada tiket terhubung. Entitas dihapus secara permanen dari basis data.",
      unitCode: asset.unit_code,
    },
  });

  return {
    asset: { id, unitCode: asset.unit_code, unit_code: asset.unit_code },
    deleteAction: "HARD",
    message: "Asset berhasil dihapus secara permanen (Hard Delete)",
  };
};
