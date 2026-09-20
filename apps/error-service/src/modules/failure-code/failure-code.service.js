import createError from "http-errors";
import * as failureCodeRepo from "./failure-code.repository.js";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";

export const getFailureCodes = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.componentId) {
    where.componentId = query.componentId;
  }

  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [failureCodes, total] = await Promise.all([
    failureCodeRepo.findMany({ skip, take: limitNum, where }),
    failureCodeRepo.count(where),
  ]);

  return {
    failureCodes,
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
  return failureCode;
};

export const createFailureCode = async (data, actorUser = null) => {
  // Verifikasi component ada
  const component = await prisma.component.findUnique({
    where: { id: data.componentId },
  });
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }

  // Verifikasi keunikan code (global unique)
  const existing = await failureCodeRepo.findByCode(data.code);
  if (existing) {
    throw createError(409, `Failure code '${data.code}' sudah terdaftar`);
  }

  const created = await failureCodeRepo.create(data);

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
      componentId: created.componentId,
      isActive: created.isActive,
    },
  });

  return created;
};

export const updateFailureCode = async (id, data, actorUser = null) => {
  const current = await getFailureCodeById(id);

  if (data.componentId && data.componentId !== current.componentId) {
    const component = await prisma.component.findUnique({
      where: { id: data.componentId },
    });
    if (!component) {
      throw createError(404, "Komponen tidak ditemukan");
    }
  }

  if (data.code && data.code !== current.code) {
    const existing = await failureCodeRepo.findByCode(data.code);
    if (existing && existing.id !== id) {
      throw createError(409, `Failure code '${data.code}' sudah terdaftar`);
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
      before: { code: current.code, isActive: current.isActive },
      after: data,
    },
  });

  return updated;
};

export const deleteFailureCode = async (id, actorUser = null) => {
  const failureCode = await getFailureCodeById(id);

  // Constraint check: apakah ada yang nyangkut (Ticket yang memakai failureCodeId)?
  const ticketCount = await failureCodeRepo.countTicketsByFailureCodeId(id);

  if (ticketCount > 0) {
    // Masih ada tiket yang nyangkut -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE
    const softDeleted = await failureCodeRepo.update(id, { isActive: false });

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
      failureCode: softDeleted,
      deleteAction: "SOFT",
      message: `Failure code memiliki ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> Boleh HARD DELETE
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


