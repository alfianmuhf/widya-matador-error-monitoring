import createError from "http-errors";
import * as componentRepo from "./component.repository.js";

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

export const createComponent = async (data) => {
  return componentRepo.create(data);
};

export const updateComponent = async (id, data) => {
  await getComponentById(id);
  return componentRepo.update(id, data);
};

export const deleteComponent = async (id) => {
  await getComponentById(id);

  // Constraint Foreign Key check: FailureCode referencing Component
  const failureCodeCount = await componentRepo.countFailureCodesByComponentId(id);
  if (failureCodeCount > 0) {
    throw createError(
      400,
      `Tidak dapat menghapus komponen karena masih terdapat ${failureCodeCount} failure code yang terhubung. Hapus atau pindahkan failure code terlebih dahulu.`
    );
  }

  return componentRepo.deleteById(id);
};
