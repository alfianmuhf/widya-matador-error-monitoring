import createError from "http-errors";
import * as componentRepo from "./component.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const formatComponent = (c) => {
  if (!c) return null;
  return {
    id: c.id,
    prefix: c.prefix,
    name: c.name,
    sortOrder: c.sort_order,
    sort_order: c.sort_order,
    isActive: c.is_active,
    is_active: c.is_active,
    createdAt: c.created_at,
    created_at: c.created_at,
    updatedAt: c.updated_at,
    updated_at: c.updated_at,
    _count: c._count,
    failureCodes: c.failure_codes ? c.failure_codes.map(f => ({
      id: f.id,
      code: f.code,
      name: f.name,
      description: f.description,
      isActive: f.is_active,
      is_active: f.is_active,
    })) : undefined,
  };
};

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
    where.is_active = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    where.is_active = false;
  }

  const [components, total] = await Promise.all([
    componentRepo.findMany({ skip, take: limitNum, where }),
    componentRepo.count(where),
  ]);

  return {
    components: components.map(formatComponent),
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
  return formatComponent(component);
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
      isActive: created.is_active,
      changeSummary: `tambah komponen '${created.name}' (${created.prefix})`,
    },
  });

  return formatComponent(created);
};

export const updateComponent = async (id, data, actorUser = null) => {
  const current = await componentRepo.findById(id);
  if (!current) {
    throw createError(404, "Komponen tidak ditemukan");
  }
  const updated = await componentRepo.update(id, data);

  const changes = [];
  if (data.name !== undefined && data.name !== current.name) {
    changes.push(`nama: ${current.name} → ${data.name}`);
  }
  if (data.prefix !== undefined && data.prefix !== current.prefix) {
    changes.push(`prefix: ${current.prefix} → ${data.prefix}`);
  }
  if (data.sortOrder !== undefined && data.sortOrder !== current.sort_order) {
    changes.push(`sort_order: ${current.sort_order} → ${data.sortOrder}`);
  }
  if (data.isActive !== undefined && data.isActive !== current.is_active) {
    changes.push(`is_active: ${current.is_active} → ${data.isActive}`);
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
      before: { name: current.name, prefix: current.prefix, isActive: current.is_active },
      after: data,
    },
  });

  return formatComponent(updated);
};

export const deleteComponent = async (id, actorUser = null) => {
  const component = await componentRepo.findById(id);
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }

  // Constraint check: apakah ada yang nyangkut (FailureCode atau Ticket)?
  const [failureCodeCount, ticketCount] = await Promise.all([
    componentRepo.countFailureCodesByComponentId(id),
    componentRepo.countTicketsByComponentId(id),
  ]);

  const hasDependents = failureCodeCount > 0 || ticketCount > 0;

  if (hasDependents) {
    // Masih ada yang nyangkut -> SOFT DELETE
    const softDeleted = await componentRepo.update(id, { is_active: false });

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
      component: formatComponent(softDeleted),
      deleteAction: "SOFT",
      message: `Komponen memiliki ${failureCodeCount} failure code dan ${ticketCount} tiket terhubung, sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> HARD DELETE
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
