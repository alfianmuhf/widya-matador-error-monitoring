import createError from "http-errors";
import * as componentRepo from "./component.repository.js";

export const getComponents = async (query) => {
  const { page = 1, limit = 10, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { prefix: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  const [components, total] = await Promise.all([
    componentRepo.findMany({ skip, take: limit, where }),
    componentRepo.count(where),
  ]);

  return {
    components,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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
