import createError from "http-errors";
import * as failureCodeRepo from "./failure-code.repository.js";
import prisma from "../../config/prisma.js";

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
