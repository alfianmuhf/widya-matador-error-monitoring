import createError from "http-errors";
import * as failureCodeRepo from "./failure-code.repository.js";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const formatFailureCode = (f) => {
  if (!f) return null;
  return {
    id: f.id,
    componentId: f.component_id,
    component_id: f.component_id,
    code: f.code,
    name: f.name,
    description: f.description,
    isActive: f.is_active,
    is_active: f.is_active,
    createdAt: f.created_at,
    created_at: f.created_at,
    updatedAt: f.updated_at,
    updated_at: f.updated_at,
    component: f.component ? {
      id: f.component.id,
      prefix: f.component.prefix,
      name: f.component.name,
      sortOrder: f.component.sort_order,
      sort_order: f.component.sort_order,
    } : undefined,
  };
};

export const getFailureCodes = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.componentId || query.component_id) {
    where.component_id = query.componentId || query.component_id;
  }

  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.is_active = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.is_active = false;
  }

  const [failureCodes, total] = await Promise.all([
    failureCodeRepo.findMany({ skip, take: limitNum, where }),
    failureCodeRepo.count(where),
  ]);

  return {
    failureCodes: failureCodes.map(formatFailureCode),
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getFailureCodeById = async (id) => {
  const failureCode = await failureCodeRepo.findById(id);
  if (!failureCode) {
    throw createError(404, "Failure code tidak ditemukan");
  }
  return formatFailureCode(failureCode);
};

export const createFailureCode = async (data, actorUser = null) => {
  const componentId = data.componentId || data.component_id;
  // Verifikasi component ada
  const component = await prisma.components.findUnique({
    where: { id: componentId },
  });
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }

  // Verifikasi keunikan code untuk component ini
  const existing = await failureCodeRepo.findByComponentAndCode(componentId, data.code);
  if (existing) {
    throw createError(409, `Failure code '${data.code}' sudah terdaftar pada komponen ini`);
  }

  const created = await failureCodeRepo.create({
    component_id: componentId,
    code: data.code,
    name: data.name || null,
    description: data.description || null,
    is_active: data.isActive ?? data.is_active ?? true,
  });

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "create",
    deleteAction: "NONE",
    entityType: "FailureCode",
    entityId: created.id,
    details: {
      identifier: created.code,
      changeSummary: `tambah '${created.description || created.code}' pada ${component.name}`,
      code: created.code,
      name: created.name,
      componentId: created.component_id,
      isActive: created.is_active,
    },
  });

  return formatFailureCode(created);
};

export const updateFailureCode = async (id, data, actorUser = null) => {
  const current = await failureCodeRepo.findById(id);
  if (!current) {
    throw createError(404, "Failure code tidak ditemukan");
  }

  const newComponentId = data.componentId || data.component_id || current.component_id;
  if (newComponentId !== current.component_id) {
    const component = await prisma.components.findUnique({
      where: { id: newComponentId },
    });
    if (!component) {
      throw createError(404, "Komponen tidak ditemukan");
    }
  }

  if (data.code && (data.code !== current.code || newComponentId !== current.component_id)) {
    const existing = await failureCodeRepo.findByComponentAndCode(newComponentId, data.code);
    if (existing && existing.id !== id) {
      throw createError(409, `Failure code '${data.code}' sudah terdaftar pada komponen ini`);
    }
  }

  const updated = await failureCodeRepo.update(id, data);

  const changesStr = Object.keys(data)
    .map((k) => `${k}: ${current[k]} → ${data[k]}`)
    .join(", ");

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "update",
    deleteAction: "NONE",
    entityType: "FailureCode",
    entityId: updated.id,
    details: {
      identifier: updated.code,
      changeSummary: changesStr || "pembaruan failure code",
      before: { code: current.code, isActive: current.is_active },
      after: data,
    },
  });

  return formatFailureCode(updated);
};

export const deleteFailureCode = async (id, actorUser = null) => {
  const failureCode = await failureCodeRepo.findById(id);
  if (!failureCode) {
    throw createError(404, "Failure code tidak ditemukan");
  }

  // Constraint check: apakah ada tiket yang memakai failureCodeId?
  const ticketCount = await failureCodeRepo.countTicketsByFailureCodeId(id);

  if (ticketCount > 0) {
    // Masih ada tiket yang nyangkut -> SOFT DELETE
    const softDeleted = await failureCodeRepo.update(id, { is_active: false });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "delete",
      deleteAction: "SOFT",
      entityType: "FailureCode",
      entityId: id,
      details: {
        identifier: failureCode.code,
        changeSummary: `nonaktifkan (soft delete - terdapat ${ticketCount} tiket)`,
        reason: `Terdapat ${ticketCount} tiket yang terhubung ke failure code ini. Entitas dinonaktifkan (Soft Delete).`,
        ticketCount,
      },
    });

    return {
      failureCode: formatFailureCode(softDeleted),
      deleteAction: "SOFT",
      message: `Failure code memiliki ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> HARD DELETE
  await failureCodeRepo.deleteById(id);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "delete",
    deleteAction: "HARD",
    entityType: "FailureCode",
    entityId: id,
    details: {
      identifier: failureCode.code,
      changeSummary: "hapus permanen",
      reason: "Tidak ada tiket terhubung. Entitas dihapus secara permanen dari basis data.",
      code: failureCode.code,
    },
  });

  return {
    failureCode: { id, code: failureCode.code },
    deleteAction: "HARD",
    message: "Failure code berhasil dihapus secara permanen (Hard Delete)",
  };
};
