import { useState, useEffect, useMemo } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AddAssigneeModal({ isOpen, onClose, ticket, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";

  // Selection state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLeader, setIsLeader] = useState(false);

  // Available software users list
  const [softwareUsers, setSoftwareUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [transferringLeaderId, setTransferringLeaderId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Custom Popup Dialog states (Menggantikan alert & confirm bawaan browser)
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  // Current assignees of the ticket
  const currentAssignees = useMemo(() => {
    if (!ticket) return [];
    return (ticket.assignees || ticket.assignedMembers || []).map((a) => {
      const tgUsername = a.user?.telegram_user?.username || a.telegramUser?.username;
      const teleTag = tgUsername ? `@${tgUsername}` : null;
      return {
        id: a.id,
        name: a.name || a.user?.name || a.telegramUser?.full_name || "Anggota Tim",
        email: a.identifier || a.email || a.user?.email || "-",
        telegramTag: teleTag,
        isLeader: Boolean(a.isLeader || a.isLead),
        userId: a.userId || a.user_id,
        role: a.user?.role || a.role || "TEKNISI",
        division: a.user?.division || "software",
      };
    });
  }, [ticket]);

  // Set of assigned user IDs for fast lookup & disabling in dropdown
  const assignedUserIds = useMemo(() => {
    return new Set(currentAssignees.map((a) => a.userId).filter(Boolean));
  }, [currentAssignees]);

  const hasLeader = useMemo(() => {
    return currentAssignees.some((a) => a.isLeader);
  }, [currentAssignees]);

  // Fetch available software users when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmModal(null);
    setAlertModal(null);
    setSelectedUserId("");
    setIsLeader(!hasLeader); // default true if ticket has no leader yet

    setFetchingUsers(true);
    api
      .get("/users?limit=100")
      .then((res) => {
        const rawUsers = res.data?.data?.users || (Array.isArray(res.data?.data) ? res.data?.data : []);
        // Filter: software division users
        const softwareOnly = rawUsers.filter((u) => {
          const div = (u.division || "").toLowerCase();
          const r = (u.role || "").toLowerCase();
          return div === "software" || r === "coordinator" || r === "admin";
        });
        setSoftwareUsers(softwareOnly);
      })
      .catch((err) => {
        console.error("Gagal memuat daftar pengguna software:", err);
      })
      .finally(() => {
        setFetchingUsers(false);
      });
  }, [isOpen, hasLeader]);

  if (!isOpen || !ticket) return null;

  // Handle submit add assignee
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedUserId) {
      setAlertModal({
        type: "warning",
        title: "Perhatian",
        message: "Silakan pilih akun anggota tim Software terlebih dahulu sebelum menyimpan.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        userId: selectedUserId,
        isLeader: Boolean(isLeader),
      };

      const res = await api.post(`/ticket-management/${ticket.id}/assignees`, payload);
      const updated = res.data?.data?.ticket || res.data?.data;

      const successText = res.data?.message || "Anggota tim Software berhasil ditambahkan ke tiket!";
      setSuccessMessage(successText);
      setSelectedUserId("");

      setAlertModal({
        type: "success",
        title: "Berhasil",
        message: successText,
      });

      if (onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error("Gagal menambah anggota ke tiket:", err);
      const detailMsg = err.response?.data?.details?.[0]?.message;
      const msg = detailMsg || err.response?.data?.message || "Gagal menambahkan anggota ke tiket.";
      setErrorMessage(msg);
      setAlertModal({
        type: "error",
        title: "Gagal Menambahkan Anggota",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger popup konfirmasi alihkan leader
  const handleRequestChangeLeader = (assignee) => {
    setConfirmModal({
      title: "Alihkan Tanggung Jawab Leader",
      message: `Alihkan tanggung jawab Leader tim Software tiket ini kepada "${assignee.name}"?`,
      subMessage:
        "Status anggota ini akan berubah menjadi Leader, dan Leader sebelumnya otomatis menjadi anggota biasa.",
      confirmText: "Ya, Alihkan Leader",
      confirmBg: "#0e8587",
      icon: "👑",
      onConfirm: async () => {
        try {
          setTransferringLeaderId(assignee.id);
          setConfirmModal(null);
          setErrorMessage(null);

          const res = await api.patch(`/ticket-management/${ticket.id}/leader`, {
            assigneeId: assignee.id,
            userId: assignee.userId,
          });
          const updated = res.data?.data?.ticket || res.data?.data;

          const msg = `Tanggung jawab Leader tim Software berhasil dialihkan kepada '${assignee.name}'!`;
          setSuccessMessage(msg);
          setAlertModal({
            type: "success",
            title: "Leader Berhasil Dialihkan",
            message: msg,
          });

          if (onSuccess) {
            onSuccess(updated);
          }
        } catch (err) {
          console.error("Gagal mengalihkan leader:", err);
          const msg = err.response?.data?.message || "Gagal mengalihkan leader tim Software.";
          setErrorMessage(msg);
          setAlertModal({
            type: "error",
            title: "Gagal Mengalihkan Leader",
            message: msg,
          });
        } finally {
          setTransferringLeaderId(null);
        }
      },
    });
  };

  // Trigger popup konfirmasi hapus anggota (Leader dilarang dihapus, hanya anggota)
  const handleRequestRemoveMember = (assignee) => {
    if (assignee.isLeader) {
      setAlertModal({
        type: "warning",
        title: "Leader Tidak Dapat Dihapus",
        message:
          "Leader tim tidak dapat langsung dihapus dari tim. Silakan alihkan tanggung jawab Leader ke anggota lain terlebih dahulu, kemudian hapus setelah statusnya menjadi anggota biasa.",
      });
      return;
    }

    setConfirmModal({
      title: "Hapus Anggota dari Tim",
      message: `Apakah Anda yakin ingin menghapus "${assignee.name}" dari penugasan tiket ini?`,
      subMessage: "Anggota ini tidak akan lagi memiliki akses tugas pengerjaan untuk tiket ini.",
      confirmText: "Ya, Hapus Anggota",
      confirmBg: "#dc2626",
      icon: "🗑️",
      onConfirm: async () => {
        try {
          setRemovingId(assignee.id);
          setConfirmModal(null);
          setErrorMessage(null);

          const res = await api.delete(`/ticket-management/${ticket.id}/assignees/${assignee.id}`);
          const updated = res.data?.data?.ticket || res.data?.data;

          const msg = res.data?.message || `Anggota '${assignee.name}' berhasil dihapus dari tim tiket.`;
          setSuccessMessage(msg);
          setAlertModal({
            type: "success",
            title: "Anggota Dihapus",
            message: msg,
          });

          if (onSuccess) {
            onSuccess(updated);
          }
        } catch (err) {
          console.error("Gagal menghapus anggota:", err);
          const msg = err.response?.data?.message || "Gagal menghapus anggota dari tiket.";
          setErrorMessage(msg);
          setAlertModal({
            type: "error",
            title: "Gagal Menghapus Anggota",
            message: msg,
          });
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#e8f7f6",
                color: "#0e8587",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              👥
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 750, color: "var(--text-dark)" }}>
                Kelola Tim Software & Leader
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                <span style={{ fontSize: "12.5px", fontFamily: "monospace", fontWeight: 700, color: "#0e8587" }}>
                  {ticket.id}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>•</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Unit: <b>{ticket.unit || ticket.unitCode || "-"}</b>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: "8px",
              borderRadius: "8px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* ALERT MESSAGES */}
          {errorMessage && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <span style={{ flex: 1 }}>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>✓</span>
              <span style={{ flex: 1 }}>{successMessage}</span>
            </div>
          )}

          {/* SECTION 1: DAFTAR ANGGOTA SAAT INI */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                Anggota Tim Software Terdaftar ({currentAssignees.length})
              </span>
              {hasLeader && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    border: "1px solid #fde68a",
                  }}
                >
                  👑 Memiliki Leader
                </span>
              )}
            </div>

            {currentAssignees.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "12.5px",
                }}
              >
                Belum ada anggota tim software yang ditugaskan pada tiket ini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {currentAssignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: assignee.isLeader ? "#f0fdfa" : "#f8fafc",
                      border: assignee.isLeader ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          backgroundColor: assignee.isLeader ? "#0e8587" : "#cbd5e1",
                          color: assignee.isLeader ? "#ffffff" : "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {assignee.name ? assignee.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {assignee.name}
                          </span>
                          {assignee.isLeader && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 750,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#0e8587",
                                color: "#ffffff",
                              }}
                            >
                              LEADER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                          {assignee.email} {assignee.telegramTag && <b style={{ color: "#0284c7" }}>• {assignee.telegramTag}</b>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px", flexShrink: 0 }}>
                      {/* Tombol Jadikan Leader (jika bukan leader saat ini) */}
                      {!assignee.isLeader && (
                        <button
                          type="button"
                          onClick={() => handleRequestChangeLeader(assignee)}
                          disabled={transferringLeaderId === assignee.id}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid #fde68a",
                            backgroundColor: "#fffbeb",
                            color: "#b45309",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: transferringLeaderId === assignee.id ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.15s ease",
                          }}
                          title="Alihkan tanggung jawab Leader software ke anggota ini"
                        >
                          👑 Jadikan Leader
                        </button>
                      )}

                      {/* Tombol Hapus Anggota - HANYA ANGGOTA BIASA (LEADER TIDAK BOLEH ADA OPSI HAPUS) */}
                      {!assignee.isLeader && (
                        <button
                          type="button"
                          onClick={() => handleRequestRemoveMember(assignee)}
                          disabled={removingId === assignee.id}
                          style={{
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: removingId === assignee.id ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Hapus anggota dari tiket"
                        >
                          {removingId === assignee.id ? (
                            "..."
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Hapus
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

          {/* SECTION 2: FORM TAMBAH ANGGOTA BARU */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Pilih Akun Pengguna Software
              </label>

              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={fetchingUsers || submitting}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13px",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Pilih Akun dari Divisi Software --</option>
                {softwareUsers.map((u) => {
                  const already = assignedUserIds.has(u.id);
                  const tgUser = u.telegram_user ? `@${u.telegram_user.username || u.telegram_user.full_name}` : "";
                  return (
                    <option key={u.id} value={u.id} disabled={already}>
                      {u.name} ({u.email}) {tgUser ? `• ${tgUser}` : ""} {already ? "✓ [Sudah Terdaftar]" : ""}
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                Akun yang dipilih otomatis tersambung dengan akun Telegram pengguna yang berelasi.
              </span>
            </div>

            {/* CHECKBOX LEADER */}
            <div
              style={{
                backgroundColor: isLeader ? "#f0fdfa" : "#f8fafc",
                border: isLeader ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                cursor: "pointer",
              }}
              onClick={() => setIsLeader(!isLeader)}
            >
              <input
                type="checkbox"
                id="isLeaderCheckbox"
                checked={isLeader}
                onChange={(e) => setIsLeader(e.target.checked)}
                style={{ marginTop: "2px", cursor: "pointer", accentColor: "#0e8587" }}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="isLeaderCheckbox"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: isLeader ? "#0e8587" : "#334155",
                    cursor: "pointer",
                    display: "block",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  👑 Tetapkan sebagai Leader Tim Software
                </label>
                <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", display: "block" }}>
                  {!hasLeader
                    ? "Tiket ini belum memiliki Leader. Menandai opsi ini akan menetapkan anggota tersebut sebagai Leader penanganan."
                    : "Perhatian: Menandai ini akan mengalihkan peran Leader tim Software tiket ini ke anggota baru tersebut."}
                </span>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 650,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Tutup
              </button>

              <button
                type="submit"
                disabled={submitting || fetchingUsers || !selectedUserId}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: selectedUserId ? "#0e8587" : "#94a3b8",
                  color: "#ffffff",
                  cursor: submitting || fetchingUsers || !selectedUserId ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(14, 133, 135, 0.25)",
                  transition: "background-color 0.15s ease",
                }}
              >
                {submitting ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ animation: "spin 1s linear infinite" }}
                    >
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Tambah Anggota
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* POPUP KONFIRMASI (MENGGANTIKAN WINDOW.CONFIRM) */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10010,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              textAlign: "center",
              animation: "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: confirmModal.confirmBg === "#dc2626" ? "#fef2f2" : "#e8f7f6",
                color: confirmModal.confirmBg || "#0e8587",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px auto",
                border: `1.5px solid ${confirmModal.confirmBg === "#dc2626" ? "#fecaca" : "#ccfbf1"}`,
              }}
            >
              {confirmModal.icon || "ℹ️"}
            </div>

            <h4
              style={{
                margin: "0 0 8px 0",
                fontSize: "17px",
                fontWeight: 750,
                color: "#0f172a",
              }}
            >
              {confirmModal.title}
            </h4>

            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "13.5px",
                lineHeight: "1.5",
                color: "#334155",
                fontWeight: 500,
              }}
            >
              {confirmModal.message}
            </p>

            {confirmModal.subMessage && (
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  color: "#64748b",
                }}
              >
                {confirmModal.subMessage}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                marginTop: confirmModal.subMessage ? "0" : "18px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 650,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: confirmModal.confirmBg || "#0e8587",
                  color: "#ffffff",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP NOTIFIKASI / ALERT (MENGGANTIKAN ALERT BIASA) */}
      {alertModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10020,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setAlertModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              textAlign: "center",
              animation: "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor:
                  alertModal.type === "error"
                    ? "#fef2f2"
                    : alertModal.type === "warning"
                    ? "#fffbeb"
                    : "#f0fdf4",
                color:
                  alertModal.type === "error"
                    ? "#dc2626"
                    : alertModal.type === "warning"
                    ? "#d97706"
                    : "#16a34a",
                fontSize: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px auto",
                border: `1.5px solid ${
                  alertModal.type === "error"
                    ? "#fecaca"
                    : alertModal.type === "warning"
                    ? "#fde68a"
                    : "#bbf7d0"
                }`,
              }}
            >
              {alertModal.type === "error" ? "✕" : alertModal.type === "warning" ? "!" : "✓"}
            </div>

            <h4
              style={{
                margin: "0 0 8px 0",
                fontSize: "17px",
                fontWeight: 750,
                color: "#0f172a",
              }}
            >
              {alertModal.title}
            </h4>

            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "13.5px",
                lineHeight: "1.5",
                color: "#475569",
              }}
            >
              {alertModal.message}
            </p>

            <button
              type="button"
              onClick={() => setAlertModal(null)}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                backgroundColor: alertModal.type === "error" ? "#dc2626" : "#0e8587",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
