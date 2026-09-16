import createError from "http-errors";
import * as userRepository from "./user.repository.js";
import { hashPassword } from "../../utils/hash.js";

/**
 * Admin creates a new user with generated initial password:
 * Format: [email_prefix] + [4 random digits]
 * Example: joko@gmail.com -> joko7457
 */
export const createUser = async ({ email, name, role }, adminId) => {
  // 1. Check if email already registered
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
  }

  // 2. Generate initial password: prefix email + 4 digit acak
  const emailPrefix = email.split("@")[0];
  const random4Digits = Math.floor(1000 + Math.random() * 9000);
  const initialPassword = `${emailPrefix}${random4Digits}`;

  // 3. Hash the generated password
  const hashedPassword = await hashPassword(initialPassword);

  // 4. Save new user to database
  const newUser = await userRepository.createUser({
    email,
    name,
    role: role || "VIEWER",
    passwordHash: hashedPassword,
    status: "ACTIVE",
    mustChangePassword: true,
    createdById: adminId || null,
  });

  return {
    user: newUser,
    initialPassword, // Dikembalikan agar Admin dapat memberikan kredensial awal ke user
  };
};

/**
 * Get users list with pagination and filtering
 */
export const getUsers = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : undefined;
  const role = query.role || undefined;
  const status = query.status || undefined;

  const { users, total } = await userRepository.findUsers({
    skip,
    take: limit,
    search,
    role,
    status,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Get single user detail by ID
 */
export const getUserById = async (id) => {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw createError(404, "Pengguna tidak ditemukan");
  }

  return user;
};
