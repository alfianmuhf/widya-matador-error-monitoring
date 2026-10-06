/**
 * ticketAssignees.js
 * Utility helper untuk mengelola penugasan anggota tim (PIC / Assignees) pada tiket
 * Disimpan secara reaktif dengan persistensi lokal (localStorage) dan sinkronisasi ke riwayat tiket.
 */

const STORAGE_KEY = "erad_ticket_team_assignments";

export const DEFAULT_TEAM_MEMBERS = [
  {
    id: "user-tech-1",
    name: "Rudi Teknisi",
    email: "rudi@widya.com",
    role: "TEKNISI",
    avatarBg: "#0e8587",
  },
  {
    id: "user-coord-1",
    name: "Dimas Koordinator",
    email: "coordinator@widya.com",
    role: "COORDINATOR",
    avatarBg: "#3b82f6",
  },
  {
    id: "user-admin-1",
    name: "Jibran Aftersales",
    email: "jibran@widya.com",
    role: "ADMIN",
    avatarBg: "#8b5cf6",
  },
  {
    id: "user-tech-2",
    name: "Ahmad Teknisi Lapangan",
    email: "ahmad@widya.com",
    role: "TEKNISI",
    avatarBg: "#f59e0b",
  },
  {
    id: "user-tech-3",
    name: "Budi Santoso",
    email: "budi@widya.com",
    role: "TEKNISI",
    avatarBg: "#10b981",
  },
];

// Inisialisasi data penugasan default jika belum ada di localStorage
function getInitialAssignments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Gagal membaca penugasan dari localStorage:", err);
  }

  // Sample default initial seed
  const initial = {
    "TCK-001": [
      { id: "user-tech-1", name: "Rudi Teknisi", email: "rudi@widya.com", role: "TEKNISI", isLead: true },
      { id: "user-tech-2", name: "Ahmad Teknisi Lapangan", email: "ahmad@widya.com", role: "TEKNISI", isLead: false },
    ],
    "TCK-002": [
      { id: "user-coord-1", name: "Dimas Koordinator", email: "coordinator@widya.com", role: "COORDINATOR", isLead: true },
    ],
    "TCK-003": [
      { id: "user-admin-1", name: "Jibran Aftersales", email: "jibran@widya.com", role: "ADMIN", isLead: true },
    ],
    "TCK-005": [
      { id: "user-tech-3", name: "Budi Santoso", email: "budi@widya.com", role: "TEKNISI", isLead: true },
    ],
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function getAllTicketAssignments() {
  return getInitialAssignments();
}

export function getAssignmentsForTicket(ticketId) {
  if (!ticketId) return [];
  const map = getAllTicketAssignments();
  return map[ticketId] || [];
}

export function setAssignmentsForTicket(ticketId, members) {
  if (!ticketId) return;
  const map = getAllTicketAssignments();
  map[ticketId] = members;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error("Gagal menyimpan ke localStorage:", err);
  }
  return members;
}

export function assignMemberToTicket(ticketId, member, isLead = false) {
  const current = getAssignmentsForTicket(ticketId);
  // Hindari duplikasi
  const exists = current.some((m) => m.id === member.id || m.email === member.email);
  if (exists) return current;

  // Jika isLead true dan sudah ada lead, ubah lead sebelumnya jadi false
  let updated = current;
  if (isLead) {
    updated = current.map((m) => ({ ...m, isLead: false }));
  } else if (current.length === 0) {
    // Jika anggota pertama, otomatis jadikan PIC Utama
    isLead = true;
  }

  const newMember = {
    id: member.id || `m-${Date.now()}`,
    name: member.name || member.email,
    email: member.email || "",
    role: member.role || "TEKNISI",
    isLead,
    assignedAt: new Date().toISOString(),
  };

  updated = [...updated, newMember];
  setAssignmentsForTicket(ticketId, updated);
  return updated;
}

export function removeMemberFromTicket(ticketId, memberId) {
  const current = getAssignmentsForTicket(ticketId);
  const updated = current.filter((m) => m.id !== memberId);
  // Jika lead dihapus dan masih ada anggota lain, promosikan anggota pertama jadi lead
  if (updated.length > 0 && !updated.some((m) => m.isLead)) {
    updated[0].isLead = true;
  }
  setAssignmentsForTicket(ticketId, updated);
  return updated;
}
