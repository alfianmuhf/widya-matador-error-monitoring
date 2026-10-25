import createError from "http-errors";
import prisma from "../../config/prisma.js";
import { getCache, setCache } from "../../config/redis.js";
import { formatTicket } from "../ticket/services/ticket-format.service.js";
import {
  updateTicket as coreUpdateTicket,
  transferAftersalesLead as coreTransferAftersalesLead,
} from "../ticket/services/ticket-core.service.js";
import {
  addAssignee as coreAddAssignee,
  removeAssignee as coreRemoveAssignee,
  getTicketAssignees as coreGetTicketAssignees,
  changeLeader as coreChangeLeader,
} from "../ticket/services/ticket-assignee.service.js";
import * as ticketRepo from "../ticket/ticket.repository.js";
import * as managementRepo from "./ticket-management.repository.js";
export * from "./ticket-permission.service.js";

/**
 * Service untuk mengambil tiket yang dikelola oleh coordinator:
 * - Khusus role 'coordinator'
 * - Jika division 'after_sales': tiket berstatus 'open' yang dibuat oleh dirinya (dilihat dari riwayat version 1 / awal)
 * - Jika division 'software': tiket berstatus 'escalated' yang mana dirinya masuk ke dalam ticket_assignees
 */
export const getManagedTickets = async (actorUser, query = {}) => {
  if (!actorUser) {
    throw createError(401, "Autentikasi diperlukan");
  }

  // Verifikasi role coordinator dari DB
  const dbUser = await prisma.users.findUnique({
    where: { id: actorUser.id },
    select: { id: true, name: true, username: true, role: true, division: true },
  });

  if (!dbUser) {
    throw createError(404, "User tidak ditemukan");
  }

  const role = (dbUser.role || "").toLowerCase();
  if (role !== "coordinator" && role !== "admin") {
    throw createError(403, "Akses ditolak: Menu manajemen tiket hanya dapat diakses oleh peran Coordinator dan Admin.");
  }

  const division = (dbUser.division || actorUser.division || (role === "admin" ? "admin" : "")).toLowerCase();
  if (role !== "admin" && (!division || (division !== "after_sales" && division !== "software" && division !== "rnd"))) {
    throw createError(
      403,
      "Akses ditolak: Divisi coordinator harus terdefinisi sebagai 'after_sales' atau 'rnd'."
    );
  }

  const { search, severity, countOnly, page = 1, limit = 50 } = query;

  const targetDivisionLabel =
    role === "admin"
      ? "Semua Tiket Belum Solved (Status Open & Escalated)"
      : division === "after_sales"
      ? "Tim Aftersales (Status Open)"
      : "Tim RnD (Status Escalated & Assigned)";

  // Check Redis cache for KPI
  const kpiCacheKey = `ticket-management:kpi:${role}:${division}:${dbUser.id}`;
  let kpiStats = await getCache(kpiCacheKey);
  if (!kpiStats) {
    kpiStats = await managementRepo.getManagedTicketsKPI({
      userId: dbUser.id,
      division,
      role,
    });
    await setCache(kpiCacheKey, kpiStats, 30);
  }

  // Jika request hanya membutuhkan count / KPI (misal dari Sidebar badge count)
  if (countOnly === "true") {
    return {
      tickets: [],
      meta: {
        total: kpiStats.total,
        division,
        role,
        coordinatorName: dbUser.name,
        coordinatorUsername: dbUser.username,
        coordinatorEmail: dbUser.username,
      },
      kpi: {
        total: kpiStats.total,
        highSeverityCount: kpiStats.highSeverityCount,
        targetDivision: targetDivisionLabel,
      },
    };
  }

  const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const skip = (pageNum - 1) * limitNum;

  // 1. Ambil ID tiket yang memenuhi kriteria spesifik divisi/role dengan batas paginasi
  const managedTicketIds = await managementRepo.findManagedTicketIds({
    userId: dbUser.id,
    division,
    role,
    severity,
    search,
    limit: limitNum,
    skip,
  });

  // 2. Ambil data tiket lengkap
  const rawTickets = await managementRepo.findManagedTicketsByIds(managedTicketIds);

  // 3. Format tiket menggunakan standar ticket-format.service
  const formattedTickets = rawTickets.map(formatTicket);

  return {
    tickets: formattedTickets,
    meta: {
      total: kpiStats.total,
      page: pageNum,
      limit: limitNum,
      division,
      role,
      coordinatorName: dbUser.name,
      coordinatorUsername: dbUser.username,
      coordinatorEmail: dbUser.username,
    },
    kpi: {
      total: kpiStats.total,
      highSeverityCount: kpiStats.highSeverityCount,
      targetDivision: targetDivisionLabel,
    },
  };
};

/**
 * Service untuk memperbarui tiket dari halaman manajemen tiket
 */
export const updateManagedTicket = async (ticketId, data, actorUser) => {
  return coreUpdateTicket(ticketId, data, actorUser);
};

/**
 * Service untuk mengalihkan penanggung jawab aftersales
 */
export const transferManagedAftersalesLead = async (ticketId, data, actorUser) => {
  return coreTransferAftersalesLead(ticketId, data, actorUser);
};

/**
 * Service untuk mengalihkan leader tim software / handover tanggung jawab ke tim RnD lain
 */
export const changeManagedLeader = async (ticketId, data, actorUser) => {
  return coreChangeLeader(ticketId, data, actorUser);
};

export const handoverManagedTeam = async (ticketId, data, actorUser) => {
  return coreChangeLeader(ticketId, data, actorUser);
};

/**
 * Service untuk menambah tim / anggota ke tiket
 */
export const addManagedAssignee = async (ticketId, data, actorUser) => {
  if (!actorUser) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: actorUser.id },
    select: { id: true, role: true, division: true },
  });

  const role = (dbUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const division = (dbUser?.division || "").toLowerCase();

  if (!isAdmin && role !== "coordinator") {
    throw createError(403, "Akses ditolak: Hanya peran Coordinator dan Admin yang dapat mengelola penugasan di modul ini.");
  }

  if (!isAdmin && division !== "software" && division !== "rnd") {
    throw createError(403, "Akses ditolak: Pengelolaan tim RnD hanya dapat dilakukan oleh Koordinator RnD atau Admin.");
  }

  await checkManageTicketTeamsPermission(ticketId, actorUser);

  return coreAddAssignee(ticketId, data, actorUser);
};

export const addManagedTeam = async (ticketId, data, actorUser) => {
  return addManagedAssignee(ticketId, data, actorUser);
};

/**
 * Service untuk menghapus tim / anggota dari tiket
 */
export const removeManagedAssignee = async (ticketId, assigneeId, actorUser) => {
  if (!actorUser) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: actorUser.id },
    select: { id: true, role: true, division: true },
  });

  const role = (dbUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const division = (dbUser?.division || "").toLowerCase();

  if (!isAdmin && role !== "coordinator") {
    throw createError(403, "Akses ditolak: Hanya peran Coordinator dan Admin yang dapat mengelola penugasan di modul ini.");
  }

  if (!isAdmin && division !== "software" && division !== "rnd") {
    throw createError(403, "Akses ditolak: Pengelolaan tim RnD hanya dapat dilakukan oleh Koordinator RnD atau Admin.");
  }

  await checkManageTicketTeamsPermission(ticketId, actorUser);

  return coreRemoveAssignee(ticketId, assigneeId, actorUser);
};

export const removeManagedTeam = async (ticketId, teamId, actorUser) => {
  return removeManagedAssignee(ticketId, teamId, actorUser);
};
