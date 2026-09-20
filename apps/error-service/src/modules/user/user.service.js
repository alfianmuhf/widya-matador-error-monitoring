import createError from "http-errors";
import * as userRepository from "./user.repository.js";
import { hashPassword } from "../../utils/hash.js";
import { recordLog } from "../audit-log/audit-log.service.js";

/**
 * Admin creates a new user with generated initial password:
 * Format: [email_prefix]12345 (nama email sebelum tanda @ diikuti '12345')
 * Example: joko@gmail.com -> joko12345
 */
export const createUser = async ({ email, name, role }, adminUser = null) => {
  const adminId = adminUser?.id || null;

  // 1. Check if email already registered
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
  }

  // 2. Generate initial password: nama email sebelum @ + "12345"
  const emailPrefix = email.split("@")[0];
  const initialPassword = `${emailPrefix}12345`;

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

  await recordLog({
    actor: adminUser?.email || adminUser?.name || "Sistem",
    actorUserId: adminId,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "User",
    entityId: newUser.id,
    details: {
      identifier: newUser.email,
      changeSummary: `tambah user baru '${newUser.name}' (${newUser.role.toLowerCase()})`,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      status: newUser.status,
    },
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
 * @param {object|string} adminUser - Current admin user object or ID
 */
export const updateUser = async (id, data, adminUser) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminName = typeof adminUser === "object" ? (adminUser?.name || adminUser?.email) : `User:${adminId}`;

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

  const changes = [];
  if (data.role && data.role !== existingUser.role) changes.push(`role: ${existingUser.role} → ${data.role}`);
  if (data.status && data.status !== existingUser.status) changes.push(`status: ${existingUser.status} → ${data.status}`);
  if (data.name && data.name !== existingUser.name) changes.push(`nama: ${existingUser.name} → ${data.name}`);
  if (data.email && data.email !== existingUser.email) changes.push(`email: ${existingUser.email} → ${data.email}`);
  if (passwordChanged) changes.push("reset kata sandi");
  const changeSummary = changes.length > 0 ? changes.join(", ") : "perubahan profil pengguna";

  await recordLog({
    actor: typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : adminName,
    actorUserId: adminId || null,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "User",
    entityId: updatedUser.id,
    details: {
      identifier: updatedUser.email,
      changeSummary,
      before: { email: existingUser.email, role: existingUser.role, status: existingUser.status },
      updatedFields: Object.keys(updatePayload),
    },
  });

  return updatedUser;
};

/**
 * Admin deletes a user (Smart Delete: Soft Delete if related records exist, Hard Delete if none)
 * @param {string} id - Target user ID
 * @param {object|string} adminUser - Current admin user object or ID
 */
export const deleteUser = async (id, adminUser) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminActor = typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : (adminUser ? `User:${adminId}` : "Sistem");

  // 1. Verify target user exists
  const existingUser = await userRepository.findUserById(id);
  if (!existingUser) {
    throw createError(404, "Pengguna tidak ditemukan");
  }

  // 2. Prevent self-deletion
  if (adminId === id) {
    throw createError(400, "Tidak dapat menghapus akun Anda sendiri");
  }

  // 3. Constraint check: apakah ada yang nyangkut (Ticket, TicketHistory, ExportJob, AuditLog)?
  const dep = await userRepository.countUserDependencies(id);

  if (dep.total > 0) {
    // Masih ada data yang nyangkut -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE (SUSPENDED & revoke tokens)
    const softDeleted = await userRepository.updateUser(id, { status: "SUSPENDED" });
    await userRepository.revokeUserRefreshTokens(id);

    await recordLog({
      actor: adminActor,
      actorUserId: adminId || null,
      action: "DELETE",
      deleteAction: "SOFT",
      entityType: "User",
      entityId: id,
      details: {
        identifier: existingUser.email,
        changeSummary: `soft delete: akun dinonaktifkan (${dep.total} data terkait)`,
        reason: `Pengguna memiliki data riwayat terikat (${dep.tickets} tiket, ${dep.ticketHistories} riwayat tiket, ${dep.exportJobs} ekspor, ${dep.auditLogs} audit log). Dilakukan soft delete (SUSPENDED).`,
        dependencies: dep,
      },
    });

    return {
      user: softDeleted,
      deleteAction: "SOFT",
      message: `Pengguna memiliki riwayat aktif (${dep.total} data terkait) sehingga dinonaktifkan (Soft Delete / SUSPENDED).`,
    };
  }

  // Tidak ada data yang nyangkut -> Boleh HARD DELETE
  await userRepository.deleteUser(id);

  await recordLog({
    actor: adminActor,
    actorUserId: adminId || null,
    action: "DELETE",
    deleteAction: "HARD",
    entityType: "User",
    entityId: id,
    details: {
      identifier: existingUser.email,
      changeSummary: `hapus permanen user '${existingUser.email}'`,
      reason: "Tidak ada riwayat terhubung. Pengguna dihapus secara permanen dari basis data.",
      email: existingUser.email,
      name: existingUser.name,
    },
  });

  return {
    user: { id, email: existingUser.email, name: existingUser.name },
    deleteAction: "HARD",
    message: "Pengguna berhasil dihapus secara permanen (Hard Delete)",
  };
};


