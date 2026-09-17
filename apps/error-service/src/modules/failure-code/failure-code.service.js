import createError from "http-errors";
import * as failureCodeRepo from "./failure-code.repository.js";
import prisma from "../../config/prisma.js";

export const getFailureCodes = async (query) => {
  const { page = 1, limit = 10, componentId, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {};

  if (componentId) {
    where.componentId = componentId;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  const [failureCodes, total] = await Promise.all([
    failureCodeRepo.findMany({ skip, take: limit, where }),
    failureCodeRepo.count(where),
  ]);

  return {
    failureCodes,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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

export const createFailureCode = async (data) => {
  // Verifikasi component ada
  const component = await prisma.component.findUnique({
    where: { id: data.componentId },
  });
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }

  // Verifikasi keunikan [componentId, code]
  const existing = await failureCodeRepo.findByComponentAndCode(data.componentId, data.code);
  if (existing) {
    throw createError(409, `Failure code '${data.code}' sudah terdaftar pada komponen ini`);
  }

  return failureCodeRepo.create(data);
};

export const updateFailureCode = async (id, data) => {
  const current = await getFailureCodeById(id);

  const targetComponentId = data.componentId || current.componentId;
  const targetCode = data.code || current.code;

  if (data.componentId && data.componentId !== current.componentId) {
    const component = await prisma.component.findUnique({
      where: { id: data.componentId },
    });
    if (!component) {
      throw createError(404, "Komponen tidak ditemukan");
    }
  }

  if (targetComponentId !== current.componentId || targetCode !== current.code) {
    const existing = await failureCodeRepo.findByComponentAndCode(targetComponentId, targetCode);
    if (existing && existing.id !== id) {
      throw createError(409, `Failure code '${targetCode}' sudah terdaftar pada komponen ini`);
    }
  }

  return failureCodeRepo.update(id, data);
};

export const deleteFailureCode = async (id) => {
  await getFailureCodeById(id);
  return failureCodeRepo.deleteById(id);
};
