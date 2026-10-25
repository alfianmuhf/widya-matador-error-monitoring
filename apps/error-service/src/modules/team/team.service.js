import createError from "http-errors";
import prisma from "../../config/prisma.js";
import * as teamRepo from "./team.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

/**
 * Format team object for API response
 */
export const formatTeam = (team) => {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    isActive: team.is_active,
    leaderUserId: team.leader_user_id,
    leader: team.leader
      ? {
          id: team.leader.id,
          name: team.leader.name,
          username: team.leader.username,
          email: team.leader.username,
          role: team.leader.role,
          division: team.leader.division,
          telegramUser: team.leader.telegram_user || null,
        }
      : null,
    membersCount: team._count?.members ?? (team.members ? team.members.length : 0),
    members: (team.members || []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      name: m.user?.name || "Unknown",
      username: m.user?.username || "-",
      email: m.user?.username || "-",
      role: m.user?.role || null,
      division: m.user?.division || null,
      telegramUser: m.user?.telegram_user || null,
      joinedAt: m.joined_at,
    })),
    createdAt: team.created_at,
    updatedAt: team.updated_at,
  };
};

/**
 * Get teams list with search & pagination
 */
export const getTeams = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const where = {};

  if (query.isActive !== undefined && query.isActive !== "all") {
    where.is_active = query.isActive === "true";
  }

  if (query.search && query.search.trim()) {
    const q = query.search.trim();
    where.name = { contains: q, mode: "insensitive" };
  }

  const [teams, total] = await Promise.all([
    teamRepo.findTeams({ where, skip, take: limit }),
    teamRepo.countTeams(where),
  ]);

  return {
    teams: teams.map(formatTeam),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get single team by ID
 */
export const getTeamById = async (id) => {
  const team = await teamRepo.findTeamById(id);
  if (!team) {
    throw createError(404, `Tim dengan ID '${id}' tidak ditemukan`);
  }
  return formatTeam(team);
};

/**
 * Create a new team (Admin only)
 */
export const createTeam = async (data, actor) => {
  const role = (actor?.role || "").toLowerCase();
  if (role !== "admin") {
    throw createError(403, "Akses ditolak: Hanya Admin yang dapat membuat tim baru");
  }

  // Check unique name
  const existingName = await teamRepo.findTeamByName(data.name);
  if (existingName) {
    throw createError(409, `Nama tim '${data.name}' sudah digunakan`);
  }

  // Verify leader user
  const leaderUser = await prisma.users.findUnique({
    where: { id: data.leaderUserId },
    select: { id: true, name: true, username: true, status: true, division: true },
  });

  if (!leaderUser) {
    throw createError(404, "User leader tidak ditemukan");
  }

  if (leaderUser.status === "suspended") {
    throw createError(400, "User yang berstatus suspended tidak dapat dijadikan leader tim");
  }

  // Create team and automatically add leader as first member
  const newTeam = await prisma.$transaction(async (tx) => {
    const team = await tx.teams.create({
      data: {
        name: data.name,
        leader_user_id: data.leaderUserId,
        is_active: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await tx.team_members.create({
      data: {
        team_id: team.id,
        user_id: data.leaderUserId,
      },
    });

    return team;
  });

  const fullTeam = await teamRepo.findTeamById(newTeam.id);

  await recordLog({
    actor: actor?.email || actor?.name || "Admin",
    actorUserId: actor?.id || null,
    action: "CREATE",
    entityType: "Team",
    entityId: newTeam.id,
    details: {
      identifier: newTeam.name,
      leader: leaderUser.name,
      changeSummary: `membuat tim baru '${newTeam.name}' dengan leader ${leaderUser.name}`,
    },
  });

  return formatTeam(fullTeam);
};

/**
 * Update team (Admin only)
 */
export const updateTeam = async (id, data, actor) => {
  const team = await teamRepo.findTeamById(id);
  if (!team) {
    throw createError(404, `Tim dengan ID '${id}' tidak ditemukan`);
  }

  const role = (actor?.role || "").toLowerCase();

  if (role !== "admin") {
    throw createError(403, "Akses ditolak: Hanya Admin yang dapat mengubah data tim atau mengganti Leader tim");
  }

  if (data.name && data.name !== team.name) {
    const existing = await teamRepo.findTeamByName(data.name);
    if (existing && existing.id !== id) {
      throw createError(409, `Nama tim '${data.name}' sudah digunakan`);
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.leaderUserId !== undefined) updateData.leader_user_id = data.leaderUserId;

  let newLeaderUser = null;
  if (data.leaderUserId && data.leaderUserId !== team.leader_user_id) {
    newLeaderUser = await prisma.users.findUnique({
      where: { id: data.leaderUserId },
      select: { id: true, name: true, status: true, role: true, division: true },
    });
    if (!newLeaderUser) {
      throw createError(404, "User leader baru tidak ditemukan");
    }
    if (newLeaderUser.status === "suspended") {
      throw createError(400, "User leader baru tidak boleh berstatus suspended");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.teams.update({
      where: { id },
      data: updateData,
    });

    // If leader changed, ensure new leader is also a member
    if (data.leaderUserId && data.leaderUserId !== team.leader_user_id) {
      const isMember = await tx.team_members.findUnique({
        where: { team_id_user_id: { team_id: id, user_id: data.leaderUserId } },
      });
      if (!isMember) {
        await tx.team_members.create({
          data: { team_id: id, user_id: data.leaderUserId },
        });
      }
    }

    return res;
  });

  const fullTeam = await teamRepo.findTeamById(updated.id);

  await recordLog({
    actor: actor?.email || actor?.name || "Sistem",
    actorUserId: actor?.id || null,
    action: "UPDATE",
    entityType: "Team",
    entityId: id,
    details: {
      identifier: fullTeam.name,
      changeSummary: newLeaderUser
        ? `mengganti leader tim '${team.name}' menjadi ${newLeaderUser.name}`
        : `memperbarui data tim '${team.name}'`,
    },
  });

  return formatTeam(fullTeam);
};

/**
 * Delete / deactivate team (Admin only)
 */
export const deleteTeam = async (id, actor) => {
  const role = (actor?.role || "").toLowerCase();
  if (role !== "admin") {
    throw createError(403, "Akses ditolak: Hanya Admin yang dapat menghapus tim");
  }

  const team = await teamRepo.findTeamById(id);
  if (!team) {
    throw createError(404, `Tim dengan ID '${id}' tidak ditemukan`);
  }

  // Check if team has active tickets
  const activeTicketsCount = await prisma.tickets.count({
    where: {
      OR: [
        { current_team_id: id },
        { ticket_teams: { some: { team_id: id } } },
      ],
    },
  });

  if (activeTicketsCount > 0) {
    // Soft delete / deactivate
    await prisma.teams.update({
      where: { id },
      data: { is_active: false },
    });

    await recordLog({
      actor: actor?.email || actor?.name || "Admin",
      actorUserId: actor?.id || null,
      action: "DELETE",
      deleteAction: "soft",
      entityType: "Team",
      entityId: id,
      details: {
        identifier: team.name,
        changeSummary: `menonaktifkan tim '${team.name}' karena memiliki relasi tiket aktif`,
      },
    });

    return { message: `Tim '${team.name}' berhasil dinonaktifkan (memiliki relasi tiket)` };
  }

  // Hard delete
  await prisma.teams.delete({ where: { id } });

  await recordLog({
    actor: actor?.email || actor?.name || "Admin",
    actorUserId: actor?.id || null,
    action: "DELETE",
    deleteAction: "hard",
    entityType: "Team",
    entityId: id,
    details: {
      identifier: team.name,
      changeSummary: `menghapus tim '${team.name}' secara permanen`,
    },
  });

  return { message: `Tim '${team.name}' berhasil dihapus` };
};

/**
 * Add member to team (Leader of team or Admin)
 */
export const addTeamMember = async (teamId, userId, actor) => {
  const team = await teamRepo.findTeamById(teamId);
  if (!team) {
    throw createError(404, `Tim dengan ID '${teamId}' tidak ditemukan`);
  }

  const role = (actor?.role || "").toLowerCase();
  const isLeader = team.leader_user_id === actor?.id;

  if (role !== "admin" && !isLeader) {
    throw createError(403, "Akses ditolak: Hanya Leader dari tim ini atau Admin yang dapat menambahkan anggota");
  }

  const userToAdd = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, status: true, division: true },
  });

  if (!userToAdd) {
    throw createError(404, "User tidak ditemukan");
  }

  if (userToAdd.status === "suspended") {
    throw createError(400, "User yang berstatus suspended tidak dapat dimasukkan ke dalam tim");
  }

  const existingMember = await teamRepo.findTeamMember(teamId, userId);
  if (existingMember) {
    throw createError(409, `User '${userToAdd.name}' sudah terdaftar dalam tim ini`);
  }

  const newMember = await teamRepo.addTeamMember(teamId, userId);

  await recordLog({
    actor: actor?.email || actor?.name || "Sistem",
    actorUserId: actor?.id || null,
    action: "UPDATE",
    entityType: "Team",
    entityId: teamId,
    details: {
      identifier: team.name,
      addedUser: userToAdd.name,
      changeSummary: `menambahkan '${userToAdd.name}' ke tim '${team.name}'`,
    },
  });

  return {
    id: newMember.id,
    teamId: newMember.team_id,
    userId: newMember.user_id,
    user: newMember.user,
    joinedAt: newMember.joined_at,
  };
};

/**
 * Remove member from team (Leader of team or Admin)
 */
export const removeTeamMember = async (teamId, userId, actor) => {
  const team = await teamRepo.findTeamById(teamId);
  if (!team) {
    throw createError(404, `Tim dengan ID '${teamId}' tidak ditemukan`);
  }

  const role = (actor?.role || "").toLowerCase();
  const isLeader = team.leader_user_id === actor?.id;

  if (role !== "admin" && !isLeader) {
    throw createError(403, "Akses ditolak: Hanya Leader dari tim ini atau Admin yang dapat mengeluarkan anggota");
  }

  if (team.leader_user_id === userId) {
    throw createError(400, "Leader tim tidak dapat dikeluarkan dari tim. Silakan ganti leader terlebih dahulu.");
  }

  const member = await teamRepo.findTeamMember(teamId, userId);
  if (!member) {
    throw createError(404, "Anggota tidak ditemukan dalam tim ini");
  }

  await teamRepo.removeTeamMember(teamId, userId);

  await recordLog({
    actor: actor?.email || actor?.name || "Sistem",
    actorUserId: actor?.id || null,
    action: "UPDATE",
    entityType: "Team",
    entityId: teamId,
    details: {
      identifier: team.name,
      removedUser: member.user?.name,
      changeSummary: `mengeluarkan '${member.user?.name}' dari tim '${team.name}'`,
    },
  });

  return { message: `Anggota '${member.user?.name || userId}' berhasil dikeluarkan dari tim` };
};
