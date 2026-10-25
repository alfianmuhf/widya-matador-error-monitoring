import { useState, useEffect, useCallback, useMemo } from "react";
import api, { API_BASE_URL } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import UpdateTicketModal from "../components/tickets/UpdateTicketModal.jsx";
import TicketDetailDrawer from "../components/tickets/TicketDetailDrawer.jsx";
import AddAssigneeModal from "../components/tickets/AddAssigneeModal.jsx";
import TransferAftersalesModal from "../components/tickets/TransferAftersalesModal.jsx";
import CreateTicketModal from "../components/tickets/CreateTicketModal.jsx";
import TicketAttachmentModal from "../components/tickets/TicketAttachmentModal.jsx";

const formatDateTime = (val) => {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "-";
    const dateStr = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).replace(".", ":");
    return `${dateStr}, ${timeStr} WIB`;
  } catch {
    return "-";
  }
};

export default function ManajemenTiket() {
  const { user, accessToken } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const userDivision = (currentUser?.division || "").toLowerCase();

  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";
  const isAftersalesCoordinator = isCoordinator && userDivision === "after_sales";
  const canCreateTicket = isAftersalesCoordinator;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals State
  const [editingTicket, setEditingTicket] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [assigneeTicket, setAssigneeTicket] = useState(null);
  const [transferAftersalesTicket, setTransferAftersalesTicket] = useState(null);
  const [attachmentTicket, setAttachmentTicket] = useState(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper normalize assignee
  const normalizeAssignee = useCallback((a) => {
    if (!a) return null;
    return {
      id: a.id,
      ticketId: a.ticketId || a.ticket_id,
      name: a.name || a.user?.name || a.telegramUser?.full_name || a.telegramUser?.username || "Anggota Tim",
      email: a.identifier || a.user?.email || (a.telegramUser?.username ? `@${a.telegramUser.username}` : (a.email || "")),
      role: a.user?.role?.toUpperCase() || (a.telegramUser ? "TELEGRAM" : (a.role || "TEKNISI")),
      isLead: Boolean(a.isLeader || a.isLead),
      isLeader: Boolean(a.isLeader || a.isLead),
      userId: a.userId || a.user_id,
      user: a.user || null,
      telegramUser: a.telegramUser || a.user?.telegram_user || null,
    };
  }, []);

  // Fetch managed tickets from /ticket-management
  const fetchManagedTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/ticket-management");
      const list = res.data?.data || [];

      const formatted = list.map((t) => {
        const backendAssignees = (t.assignees || []).map(normalizeAssignee).filter(Boolean);
        return {
          ...t,
          assignees: backendAssignees,
          assignedMembers: backendAssignees,
        };
      });

      setTickets(formatted);
    } catch (err) {
      console.error("Gagal memuat tiket yang dikelola:", err);
      const msg = err.response?.data?.message || "Gagal memuat data tiket dari server.";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  }, [normalizeAssignee]);

  useEffect(() => {
    if (!accessToken) return;
    fetchManagedTickets();
  }, [accessToken, fetchManagedTickets]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (!accessToken) return;

    const sseUrl = `${API_BASE_URL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(sseUrl);

    const handleSSEUpdate = () => {
      fetchManagedTickets();
    };

    eventSource.addEventListener("ticket_updated", handleSSEUpdate);
    eventSource.addEventListener("ticket_created", handleSSEUpdate);

    return () => {
      eventSource.close();
    };
  }, [accessToken, fetchManagedTickets]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(tickets.length / itemsPerPage));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tickets.slice(start, start + itemsPerPage);
  }, [tickets, currentPage]);

  // Helper badge status (clean text, no dot icon)
  const getStatusBadge = (statusStr) => {
    const s = (statusStr || "").toLowerCase();
    if (s === "open") {
      return {
        label: "Open",
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#2563eb",
        border: "rgba(59, 130, 246, 0.25)",
      };
    }
    if (s === "escalated") {
      return {
        label: "Escalated",
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#d97706",
        border: "rgba(245, 158, 11, 0.3)",
      };
    }
    return {
      label: "Solved",
      bg: "rgba(16, 185, 129, 0.12)",
      color: "#059669",
      border: "rgba(16, 185, 129, 0.25)",
    };
  };

  const handleUpdateSuccess = (updated) => {
    showToast(`Tiket ${updated.id} berhasil diperbarui ke Versi ${updated.currentVersion ?? (updated.current_version ?? 0)}!`);
    fetchManagedTickets();
  };

  const handleAssigneeSuccess = (updated) => {
    showToast("Daftar tim RnD & kolaborasi berhasil diperbarui!");
    if (updated && updated.id) {
      setAssigneeTicket(updated);
    }
    fetchManagedTickets();
  };

  const handleTransferAftersalesSuccess = (updated) => {
    showToast(`Penanggung jawab Aftersales tiket ${updated.id} berhasil dialihkan!`);
    fetchManagedTickets();
  };

  const handleCreateTicketSuccess = (created) => {
    showToast(`Tiket baru ${created.id} berhasil dibuat!`);
    fetchManagedTickets();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            backgroundColor: "#11222c",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            fontSize: "13px",
            fontWeight: 600,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* HEADER AKSI: TOMBOL TAMBAH TIKET (KHUSUS COORDINATOR AFTERSALES) */}
      {canCreateTicket && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setIsCreateTicketOpen(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              backgroundColor: "#0e8587",
              color: "#ffffff",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0b7173")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0e8587")}
          >
            + Tambah Tiket
          </button>
        </div>
      )}

      {/* TABLE TIKET */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid var(--border-light)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Table Subheader Count */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #edf2f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          <div>
            Menampilkan <b>{tickets.length}</b> tiket
          </div>
          {totalPages > 1 && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Halaman {currentPage} dari {totalPages}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13.5px" }}>
            Memuat daftar tiket...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)" }}>
              Tidak ada tiket yang ditemukan
            </div>
            <p style={{ fontSize: "12.5px", marginTop: "4px" }}>
              Tidak ada tiket yang dikelola saat ini.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #edf2f7" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>ID Tiket</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Unit</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Modul & Failure Code</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.map((t) => {
                  const statusStr = (t.rawStatus || t.status || "").toLowerCase();
                  const statusBadge = getStatusBadge(statusStr);

                  // Ownership and Permissions evaluation:
                  // Update tiket HANYA boleh dilakukan oleh KOORDINATOR sesuai peran dan status (Admin TIDAK BISA update tiket)
                  const isCurrentAftersalesOwner =
                    (t.aftersales_user_id && t.aftersales_user_id === currentUser.id) ||
                    (t.aftersalesUserId && t.aftersalesUserId === currentUser.id);

                  const isSoftwareAssignee = (t.assignees || []).some((a) => a.userId === currentUser.id);
                  const isCurrentTeamLeader =
                    (t.currentTeam?.leader_user_id && t.currentTeam.leader_user_id === currentUser.id) ||
                    (t.currentTeam?.leader?.id && t.currentTeam.leader.id === currentUser.id) ||
                    (t.current_team?.leader_user_id && t.current_team.leader_user_id === currentUser.id) ||
                    (t.current_team?.leader?.id && t.current_team.leader.id === currentUser.id);

                  // Open status:
                  // - Update: HANYA koordinator Aftersales penanggung jawab (Admin TIDAK BISA update tiket)
                  // - Alihkan PJ: koordinator Aftersales penanggung jawab ATAU Admin (kelola akses PJ)
                  const canUpdateOpen = statusStr === "open" && isCoordinator && isCurrentAftersalesOwner;
                  const canTransferAftersales = statusStr === "open" && (isAdmin || (isCoordinator && isCurrentAftersalesOwner));

                  // Escalated status:
                  // - Update: Koordinator yang tergabung dalam tim penanganan tiket
                  // - Kelola Tim RnD & Handover: Koordinator Leader tim saat ini ATAU Admin
                  const canUpdateEscalated = statusStr === "escalated" && isCoordinator && isSoftwareAssignee;
                  const canManageSoftwareTeam = statusStr === "escalated" && (isAdmin || (isCoordinator && isCurrentTeamLeader));

                  const currentVersionNum = t.currentVersion ?? t.current_version ?? 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setDetailTicket(t)}
                      style={{
                        borderBottom: "1px solid #edf2f7",
                        transition: "background-color 0.15s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      title="Klik untuk melihat detail & riwayat tiket"
                    >
                      {/* 1. ID Tiket (Isi list ditambahkan versi) */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 750, color: "#0f172a", fontFamily: "monospace", fontSize: "13.5px" }}>
                            {t.id}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#e2e8f0",
                              color: "#334155",
                            }}
                          >
                            v{currentVersionNum}
                          </span>
                        </div>
                      </td>

                      {/* 2. Unit */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-dark)", fontFamily: "monospace" }}>
                          {t.unit}
                        </div>
                        {(t.client || t.location) && (
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {t.client ? `${t.client} ` : ""}{t.location ? `(${t.location})` : ""}
                          </div>
                        )}
                      </td>

                      {/* 3. Modul Komponen dan Failure Code */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 650, color: "var(--text-dark)" }}>
                          {t.component}
                        </div>
                        <div style={{ marginTop: "2px" }}>
                          <span
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 700,
                              fontFamily: "monospace",
                              backgroundColor: "var(--primary-teal-light)",
                              color: "var(--primary-teal)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {t.failureCode}
                          </span>
                        </div>
                      </td>

                      {/* 4. Status (Clean text, no dot icon) */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: "5px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                            textTransform: "capitalize",
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* 5. Aksi (Tanpa Ikon / Emoji) */}
                      <td
                        style={{ padding: "12px 16px", verticalAlign: "middle", textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {/* Aksi Status Open */}
                          {statusStr === "open" && (
                            <>
                              {canTransferAftersales && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferAftersalesTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    border: "1px solid #bfdbfe",
                                    backgroundColor: "#eff6ff",
                                    color: "#1d4ed8",
                                    cursor: "pointer",
                                  }}
                                  title="Alihkan penanggung jawab Aftersales tiket ini"
                                >
                                  Alihkan PJ
                                </button>
                              )}

                              {/* TOMBOL UNGGAH FOTO (MENU FORM SENDIRI) */}
                              {(canUpdateOpen || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAttachmentTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    border: "1px solid #99f6e4",
                                    backgroundColor: "#f0fdfa",
                                    color: "#0f766e",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title="Unggah lampiran gambar bukti penanganan"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                  Upload Foto
                                </button>
                              )}

                              {canUpdateOpen && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 11px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "none",
                                    backgroundColor: "#0e8587",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                  }}
                                >
                                  Update
                                </button>
                              )}

                              {!canTransferAftersales && !canUpdateOpen && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    backgroundColor: "#f1f5f9",
                                    padding: "3px 7px",
                                    borderRadius: "4px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  Hanya PJ
                                </span>
                              )}
                            </>
                          )}

                          {/* Aksi Status Escalated */}
                          {statusStr === "escalated" && (
                            <>
                              {canManageSoftwareTeam && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssigneeTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    border: "1px solid #fde68a",
                                    backgroundColor: "#fffbeb",
                                    color: "#b45309",
                                    cursor: "pointer",
                                  }}
                                  title="Kelola anggota dan leader tim RnD"
                                >
                                  Kelola Tim
                                </button>
                              )}

                              {/* TOMBOL UNGGAH FOTO (MENU FORM SENDIRI) */}
                              {(canUpdateEscalated || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAttachmentTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    border: "1px solid #99f6e4",
                                    backgroundColor: "#f0fdfa",
                                    color: "#0f766e",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title="Unggah lampiran gambar bukti penanganan"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                  Upload Foto
                                </button>
                              )}

                              {canUpdateEscalated && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTicket(t);
                                  }}
                                  style={{
                                    padding: "5px 11px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "none",
                                    backgroundColor: "#0e8587",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                  }}
                                >
                                  Update
                                </button>
                              )}

                              {!canManageSoftwareTeam && !canUpdateEscalated && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    backgroundColor: "#f1f5f9",
                                    padding: "3px 7px",
                                    borderRadius: "4px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  Khusus Tim
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid #edf2f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Menampilkan {Math.min(tickets.length, (currentPage - 1) * itemsPerPage + 1)}-
              {Math.min(tickets.length, currentPage * itemsPerPage)} dari {tickets.length} tiket
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: 650,
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage === 1 ? "#f1f5f9" : "#ffffff",
                  color: currentPage === 1 ? "#94a3b8" : "#334155",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: 650,
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage === totalPages ? "#f1f5f9" : "#ffffff",
                  color: currentPage === totalPages ? "#94a3b8" : "#334155",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL BUAT TIKET BARU (KHUSUS COORDINATOR AFTERSALES) */}
      {isCreateTicketOpen && (
        <CreateTicketModal
          isOpen={isCreateTicketOpen}
          onClose={() => setIsCreateTicketOpen(false)}
          onSuccess={handleCreateTicketSuccess}
        />
      )}

      {/* MODAL ALIH TANGGUNG JAWAB AFTERSALES (STATUS OPEN) */}
      {transferAftersalesTicket && (
        <TransferAftersalesModal
          isOpen={Boolean(transferAftersalesTicket)}
          onClose={() => setTransferAftersalesTicket(null)}
          ticket={transferAftersalesTicket}
          onSuccess={handleTransferAftersalesSuccess}
        />
      )}

      {/* MODAL UPDATE TIKET */}
      {editingTicket && (
        <UpdateTicketModal
          ticket={editingTicket}
          isOpen={Boolean(editingTicket)}
          onClose={() => setEditingTicket(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* DRAWER DETAIL TIKET */}
      {detailTicket && (
        <TicketDetailDrawer
          ticket={detailTicket}
          isOpen={Boolean(detailTicket)}
          onClose={() => setDetailTicket(null)}
          canAssignTeam={false}
        />
      )}

      {/* MODAL KELOLA TIM SOFTWARE & LEADER (STATUS ESCALATED) */}
      {assigneeTicket && (
        <AddAssigneeModal
          isOpen={Boolean(assigneeTicket)}
          onClose={() => setAssigneeTicket(null)}
          ticket={assigneeTicket}
          onSuccess={handleAssigneeSuccess}
        />
      )}

      {/* MODAL FORM UNGGAH GAMBAR (FORM SENDIRI) */}
      {attachmentTicket && (
        <TicketAttachmentModal
          isOpen={Boolean(attachmentTicket)}
          onClose={() => setAttachmentTicket(null)}
          ticket={attachmentTicket}
        />
      )}
    </div>
  );
}
