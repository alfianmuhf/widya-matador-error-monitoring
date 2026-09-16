import createError from "http-errors";
import * as userRepository from "./user.repository.js";
import { hashPassword } from "../../utils/hash.js";

/**
 * Admin creates a new user with generated initial password:
 * Format: [email_prefix] (nama email sebelum tanda @)
 * Example: joko@gmail.com -> joko
 */
export const createUser = async ({ email, name, role }, adminId) => {
  // 1. Check if email already registered
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
  }

  // 2. Generate initial password: nama email sebelum @
  const emailPrefix = email.split("@")[0];
  const initialPassword = emailPrefix;

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

/**
 * Admin updates an existing user
 * @param {string} id - Target user ID
 * @param {object} data - { email, name, password, role, status }
 * @param {string} adminId - Current admin user ID
 */
export const updateUser = async (id, data, adminId) => {
  // 1. Verify target user exists
  const existingUser = await userRepository.findUserById(id);
  if (!existingUser) {
    throw createError(404, "Pengguna tidak ditemukan");
  }

  // 2. Prevent self-lockout or self-demotion
  if (adminId === id) {
    if (data.status === "SUSPENDED") {
      throw createError(400, "Tidak dapat menonaktifkan (SUSPENDED) akun Anda sendiri");
    }
    if (data.role && data.role !== "ADMIN") {
      throw createError(400, "Tidak dapat mengubah role akun Anda sendiri");
    }
  }

  // 3. If email changed, check for conflicts
  if (data.email && data.email !== existingUser.email) {
    const emailOwner = await userRepository.findUserByEmail(data.email);
    if (emailOwner && emailOwner.id !== id) {
      throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
    }
  }

  // 4. Construct update payload
  const updatePayload = {};
  if (data.email !== undefined) updatePayload.email = data.email;
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.status !== undefined) updatePayload.status = data.status;

  let passwordChanged = false;
  if (data.password) {
    updatePayload.passwordHash = await hashPassword(data.password);
    updatePayload.passwordChangedAt = new Date();
    updatePayload.mustChangePassword = false;
    passwordChanged = true;
  }

  // 5. Update user in database
  const updatedUser = await userRepository.updateUser(id, updatePayload);

  // 6. If password changed or user suspended, revoke active refresh tokens
  if (passwordChanged || data.status === "SUSPENDED") {
    await userRepository.revokeUserRefreshTokens(id);
  }

  return updatedUser;
};

/**
 * Admin deletes a user
 * @param {string} id - Target user ID
 * @param {string} adminId - Current admin user ID
 */
export const deleteUser = async (id, adminId) => {
  // 1. Verify target user exists
  const existingUser = await userRepository.findUserById(id);
  if (!existingUser) {
    throw createError(404, "Pengguna tidak ditemukan");
  }

  // 2. Prevent self-deletion
  if (adminId === id) {
    throw createError(400, "Tidak dapat menghapus akun Anda sendiri");
  }

  // 3. Delete user & unlink relations in transaction
  await userRepository.deleteUser(id);

  return true;
};

