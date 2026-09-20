import createError from "http-errors";
import * as componentRepo from "./component.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

export const getComponents = async (query = {}) => {
  const pageNum = parseInt(query.page, 10) || 1;
  const limitNum = parseInt(query.limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { prefix: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.isActive === "true" || query.isActive === true) {
    where.isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.isActive = false;
  }

  const [components, total] = await Promise.all([
    componentRepo.findMany({ skip, take: limitNum, where }),
    componentRepo.count(where),
  ]);

  return {
    components,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getComponentById = async (id) => {
  const component = await componentRepo.findById(id);
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }
  return component;
};

export const createComponent = async (data, actorUser = null) => {
  const created = await componentRepo.create(data);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "Component",
    entityId: created.id,
    details: {
      identifier: created.name,
      name: created.name,
      prefix: created.prefix,
      isActive: created.isActive,
      changeSummary: `tambah komponen '${created.name}' (${created.prefix})`,
    },
  });

  return created;
};

export const updateComponent = async (id, data, actorUser = null) => {
  const current = await getComponentById(id);
  const updated = await componentRepo.update(id, data);

  const changes = [];
  if (data.name !== undefined && data.name !== current.name) {
    changes.push(`nama: ${current.name} → ${data.name}`);
  }
  if (data.prefix !== undefined && data.prefix !== current.prefix) {
    changes.push(`prefix: ${current.prefix} → ${data.prefix}`);
  }
  if (data.isActive !== undefined && data.isActive !== current.isActive) {
    changes.push(`is_active: ${current.isActive} → ${data.isActive}`);
  }
  const changeSummary = changes.length > 0 ? changes.join(", ") : "perubahan data komponen";

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "Component",
    entityId: updated.id,
    details: {
      identifier: updated.name,
      changeSummary,
      before: { name: current.name, prefix: current.prefix, isActive: current.isActive },
      after: data,
    },
  });

  return updated;
};

export const deleteComponent = async (id, actorUser = null) => {
  const component = await getComponentById(id);

  // Constraint check: apakah ada yang nyangkut (FailureCode atau Ticket)?
  const [failureCodeCount, ticketCount] = await Promise.all([
    componentRepo.countFailureCodesByComponentId(id),
    componentRepo.countTicketsByComponentId(id),
  ]);

  const hasDependents = failureCodeCount > 0 || ticketCount > 0;

  if (hasDependents) {
    // Masih ada yang nyangkut -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE
    const softDeleted = await componentRepo.update(id, { isActive: false });

    await recordLog({
      actor: actorUser?.email || actorUser?.name || "Sistem",
      actorUserId: actorUser?.id || null,
      action: "DELETE",
      deleteAction: "SOFT",
      entityType: "Component",
      entityId: id,
      details: {
        identifier: component.name,
        changeSummary: `soft delete: dinonaktifkan (${failureCodeCount} kode error, ${ticketCount} tiket terikat)`,
        reason: `Terdapat ${failureCodeCount} failure code dan ${ticketCount} tiket yang masih terhubung. Entitas dinonaktifkan (Soft Delete).`,
        failureCodeCount,
        ticketCount,
      },
    });

    return {
      component: softDeleted,
      deleteAction: "SOFT",
      message: `Komponen memiliki ${failureCodeCount} failure code dan ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> Boleh HARD DELETE
  await componentRepo.deleteById(id);

  await recordLog({
    actor: actorUser?.email || actorUser?.name || "Sistem",
    actorUserId: actorUser?.id || null,
    action: "DELETE",
    deleteAction: "HARD",
    entityType: "Component",
    entityId: id,
    details: {
      identifier: component.name,
      changeSummary: `hapus permanen komponen '${component.name}'`,
      reason: "Tidak ada relasi aktif. Entitas dihapus secara permanen dari basis data.",
      name: component.name,
      prefix: component.prefix,
    },
  });

  return {
    component: { id, name: component.name, prefix: component.prefix },
    deleteAction: "HARD",
    message: "Komponen berhasil dihapus secara permanen (Hard Delete)",
  };
};

