import createError from "http-errors";
import prisma from "../../config/prisma.js";
import { formatTicket } from "../ticket/services/ticket-format.service.js";
import { updateTicket as coreUpdateTicket } from "../ticket/services/ticket-core.service.js";
import {
  addAssignee as coreAddAssignee,
  removeAssignee as coreRemoveAssignee,
  getTicketAssignees as coreGetTicketAssignees,
} from "../ticket/services/ticket-assignee.service.js";
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
    select: { id: true, name: true, email: true, role: true, division: true },
  });

  if (!dbUser) {
    throw createError(404, "User tidak ditemukan");
  }

  const role = (dbUser.role || "").toLowerCase();
  if (role !== "coordinator") {
    throw createError(403, "Akses ditolak: Menu manajemen tiket hanya dapat diakses oleh peran Coordinator.");
  }

  const division = (dbUser.division || actorUser.division || "").toLowerCase();
  if (!division || (division !== "after_sales" && division !== "software")) {
    throw createError(
      403,
      "Akses ditolak: Divisi coordinator harus terdefinisi sebagai 'after_sales' atau 'software'."
    );
  }

  const { search, severity } = query;

  // 1. Ambil ID tiket yang memenuhi kriteria spesifik divisi
  const managedTicketIds = await managementRepo.findManagedTicketIds({
    userId: dbUser.id,
    division,
  });

  // 2. Ambil data tiket lengkap
  const rawTickets = await managementRepo.findManagedTicketsByIds(managedTicketIds, {
    search,
    severity,
  });

  // 3. Format tiket menggunakan standar ticket-format.service
  const formattedTickets = rawTickets.map(formatTicket);

  // 4. Hitung ringkasan statistik KPI khusus coordinator tersebut
  const total = formattedTickets.length;
  const highSeverityCount = formattedTickets.filter(
    (t) => (t.rawSeverity || t.severity || "").toLowerCase() === "tinggi"
  ).length;

  return {
    tickets: formattedTickets,
    meta: {
      total,
      division,
      coordinatorName: dbUser.name,
      coordinatorEmail: dbUser.email,
    },
    kpi: {
      total,
      highSeverityCount,
      targetDivision: division === "after_sales" ? "Tim Aftersales (Status Open)" : "Tim Software (Status Escalated & Assigned)",
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
 * Service untuk menambah anggota tim software ke ticket_assignees
 */
export const addManagedAssignee = async (ticketId, data, actorUser) => {
  if (!actorUser) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: actorUser.id },
    select: { id: true, role: true, division: true },
  });

  if (!dbUser || (dbUser.role || "").toLowerCase() !== "coordinator") {
    throw createError(403, "Akses ditolak: Hanya peran Coordinator yang dapat mengelola penugasan di modul ini.");
  }

  const division = (dbUser.division || "").toLowerCase();
  if (division !== "software") {
    throw createError(403, "Akses ditolak: Penambahan anggota tim software hanya dapat dilakukan oleh Koordinator Software.");
  }

  // Verifikasi bahwa tiket berstatus escalated dan koordinator terdaftar di tiket tersebut
  const isAssigned = await prisma.ticket_assignees.findFirst({
    where: { ticket_id: ticketId, user_id: dbUser.id },
  });

  if (!isAssigned) {
    throw createError(403, "Akses ditolak: Anda hanya dapat menambahkan anggota pada tiket yang ditugaskan kepada Anda.");
  }

  return coreAddAssignee(ticketId, data, actorUser);
};

/**
 * Service untuk menghapus anggota dari ticket_assignees
 */
export const removeManagedAssignee = async (ticketId, assigneeId, actorUser) => {
  if (!actorUser) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const dbUser = await prisma.users.findUnique({
    where: { id: actorUser.id },
    select: { id: true, role: true, division: true },
  });

  if (!dbUser || (dbUser.role || "").toLowerCase() !== "coordinator") {
    throw createError(403, "Akses ditolak: Hanya peran Coordinator yang dapat mengelola penugasan di modul ini.");
  }

  const division = (dbUser.division || "").toLowerCase();
  if (division !== "software") {
    throw createError(403, "Akses ditolak: Pengelolaan anggota tim software hanya dapat dilakukan oleh Koordinator Software.");
  }

  const isAssigned = await prisma.ticket_assignees.findFirst({
    where: { ticket_id: ticketId, user_id: dbUser.id },
  });

  if (!isAssigned) {
    throw createError(403, "Akses ditolak: Anda hanya dapat mengelola anggota pada tiket yang ditugaskan kepada Anda.");
  }

  return coreRemoveAssignee(ticketId, assigneeId, actorUser);
};
