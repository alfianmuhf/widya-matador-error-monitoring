import prisma from "../../config/prisma.js";
import { ticketIncludes } from "../ticket/ticket.repository.js";

/**
 * Mengambil ID tiket yang harus dikelola oleh coordinator berdasarkan divisinya:
 * - Divisi 'after_sales': Tiket status saat ini 'open' DAN dibuat oleh coordinator tersebut (dicek dari ticket_history version 1 atau version 0)
 * - Divisi 'software': Tiket status saat ini 'escalated' DAN coordinator tersebut masuk dalam ticket_assignees
 */
export const findManagedTicketIds = async ({ userId, division }) => {
  if (!userId || !division) return [];

  const div = division.toLowerCase();

  if (div === "after_sales") {
    // 1. Aftersales Coordinator:
    // Status terkini = 'open'
    // Pembuat = mengecek ticket_history version 1 (atau version 0 jika dibuat langsung di v0) dengan changed_by_user_id = userId
    const rows = await prisma.$queryRaw`
      SELECT DISTINCT t.id FROM tickets t
      JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
      JOIN ticket_history th_creator ON th_creator.ticket_id = t.id AND (th_creator.version = 1 OR th_creator.version = 0)
      WHERE th_current.status = 'open'::ticket_status
        AND th_creator.changed_by_user_id = ${userId}::uuid
    `;
    return rows.map((r) => r.id);
  }

  if (div === "software") {
    // 2. Software Coordinator:
    // Status terkini = 'escalated'
    // Masuk sebagai anggota ticket_assignees
    const rows = await prisma.$queryRaw`
      SELECT DISTINCT t.id FROM tickets t
      JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
      JOIN ticket_assignees ta ON ta.ticket_id = t.id
      WHERE th_current.status = 'escalated'::ticket_status
        AND ta.user_id = ${userId}::uuid
    `;
    return rows.map((r) => r.id);
  }

  return [];
};

/**
 * Mengambil tiket lengkap berdasarkan daftar ID tiket dan filter opsional (search, severity)
 */
export const findManagedTicketsByIds = async (ticketIds, { severity, search } = {}) => {
  if (!ticketIds || ticketIds.length === 0) return [];

  const where = {
    id: { in: ticketIds },
  };

  const rawTickets = await prisma.tickets.findMany({
    where,
    include: ticketIncludes,
    orderBy: {
      created_at: "desc",
    },
  });

  // Client-side filtering untuk search & severity berdasarkan status terkini
  return rawTickets.filter((t) => {
    const currentHist =
      (t.ticket_history || []).find((h) => h.version === t.current_version) ||
      t.ticket_history?.[0] ||
      {};

    if (severity && severity !== "all") {
      const s = (currentHist.severity || "").toLowerCase();
      if (s !== severity.toLowerCase()) return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const matchId = t.id.toLowerCase().includes(q);
      const matchUnit = (t.asset?.unit_code || "").toLowerCase().includes(q);
      const matchClient = (t.asset?.client?.name || "").toLowerCase().includes(q);
      const matchComp = (t.failure_code?.component?.name || "").toLowerCase().includes(q);
      const matchCode = (t.failure_code?.code || "").toLowerCase().includes(q);
      const matchDesc = (currentHist.damage_description || "").toLowerCase().includes(q);

      if (!matchId && !matchUnit && !matchClient && !matchComp && !matchCode && !matchDesc) {
        return false;
      }
    }

    return true;
  });
};
