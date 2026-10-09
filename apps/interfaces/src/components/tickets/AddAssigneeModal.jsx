import { useState, useEffect, useMemo } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AddAssigneeModal({ isOpen, onClose, ticket, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;

  // Member source tab: "web" | "telegram"
  const [sourceType, setSourceType] = useState("web");

  // Selection state
  const [selectedWebUserId, setSelectedWebUserId] = useState("");
  const [selectedTeleUserId, setSelectedTeleUserId] = useState("");
  const [isLeader, setIsLeader] = useState(false);

  // Available users list
  const [webUsers, setWebUsers] = useState([]);
  const [telegramUsers, setTelegramUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Current assignees of the ticket
  const currentAssignees = useMemo(() => {
    if (!ticket) return [];
    return (ticket.assignees || ticket.assignedMembers || []).map((a) => {
      return {
        id: a.id,
        name: a.name || a.user?.name || a.telegramUser?.full_name || a.telegramUser?.username || "Anggota Tim",
        identifier: a.identifier || a.email || a.user?.email || (a.telegramUser?.username ? `@${a.telegramUser.username}` : (a.telegramUser?.telegram_id || "-")),
        isLeader: Boolean(a.isLeader || a.isLead),
        userId: a.userId || a.user_id,
        telegramUserId: a.telegramUserId || a.telegram_user_id,
        role: a.user?.role || (a.telegramUser ? "Telegram" : (a.role || "Teknisi")),
        division: a.user?.division || a.telegramUser?.division || "software",
      };
    });
  }, [ticket]);

  // Set of assigned user IDs and telegram user IDs for fast lookup
  const assignedWebUserIds = useMemo(() => {
    return new Set(currentAssignees.map((a) => a.userId).filter(Boolean));
  }, [currentAssignees]);

  const assignedTeleUserIds = useMemo(() => {
    return new Set(currentAssignees.map((a) => a.telegramUserId).filter(Boolean));
  }, [currentAssignees]);

  const hasLeader = useMemo(() => {
    return currentAssignees.some((a) => a.isLeader);
  }, [currentAssignees]);

  // Fetch available users when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedWebUserId("");
    setSelectedTeleUserId("");
    setIsLeader(!hasLeader); // default to true if ticket has no leader yet

    setFetchingUsers(true);
    Promise.all([
      api.get("/users?limit=100").catch(() => ({ data: { data: { users: [] } } })),
      api.get("/telegram-users?limit=100").catch(() => ({ data: { data: [] } })),
    ])
      .then(([usersRes, teleRes]) => {
        const rawWeb = usersRes.data?.data?.users || (Array.isArray(usersRes.data?.data) ? usersRes.data?.data : []);
        const rawTele = teleRes.data?.data?.telegramUsers || (Array.isArray(teleRes.data?.data) ? teleRes.data?.data : []);

        // Filter web users: priority software division or coordinator/admin
        const softwareWeb = rawWeb.filter((u) => {
          const div = (u.division || "").toLowerCase();
          const r = (u.role || "").toLowerCase();
          return div === "software" || r === "coordinator" || r === "admin";
        });

        // Filter telegram users: priority software division
        const softwareTele = rawTele.filter((tg) => {
          const div = (tg.division || "").toLowerCase();
          return div === "software" || div === "none";
        });

        setWebUsers(softwareWeb);
        setTelegramUsers(softwareTele);
      })
      .catch((err) => {
        console.error("Gagal memuat daftar anggota software:", err);
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

    let payload = {
      isLeader: Boolean(isLeader),
    };

    if (sourceType === "web") {
      if (!selectedWebUserId) {
        setErrorMessage("Silakan pilih akun anggota Web Dashboard terlebih dahulu.");
        return;
      }
      payload.userId = selectedWebUserId;
    } else {
      if (!selectedTeleUserId) {
        setErrorMessage("Silakan pilih akun pengguna Telegram terlebih dahulu.");
        return;
      }
      payload.telegramUserId = selectedTeleUserId;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/ticket-management/${ticket.id}/assignees`, payload);
      const updated = res.data?.data?.ticket || res.data?.data;
      
      setSuccessMessage(res.data?.message || "Anggota tim software berhasil ditambahkan ke tiket!");
      setSelectedWebUserId("");
      setSelectedTeleUserId("");

      if (onSuccess) {
        onSuccess(updated);
      }

      // Close modal after brief feedback
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Gagal menambah anggota ke tiket:", err);
      const detailMsg = err.response?.data?.details?.[0]?.message;
      const msg = detailMsg || err.response?.data?.message || "Gagal menambahkan anggota ke tiket.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (assigneeId, memberName) => {
    if (!window.confirm(`Hapus ${memberName} dari tiket ini?`)) return;

    try {
      setRemovingId(assigneeId);
      setErrorMessage(null);
      const res = await api.delete(`/ticket-management/${ticket.id}/assignees/${assigneeId}`);
      const updated = res.data?.data?.ticket || res.data?.data;

      setSuccessMessage(res.data?.message || `Anggota '${memberName}' berhasil dihapus.`);
      if (onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error("Gagal menghapus anggota:", err);
      const msg = err.response?.data?.message || "Gagal menghapus anggota dari tiket.";
      setErrorMessage(msg);
    } finally {
      setRemovingId(null);
    }
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
                Kelola Anggota Tim Software
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
                Anggota Terdaftar ({currentAssignees.length})
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
                  👑 Leader Terdaftar
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
                          {assignee.identifier}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Hapus Anggota */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(assignee.id, assignee.name)}
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
                        marginLeft: "10px",
                        flexShrink: 0,
                      }}
                      title="Hapus dari tiket"
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
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

          {/* SECTION 2: FORM TAMBAH ANGGOTA BARU */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                1. Pilih Sumber Akun Anggota
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSourceType("web")}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: sourceType === "web" ? "2px solid #0e8587" : "1.5px solid #cbd5e1",
                    backgroundColor: sourceType === "web" ? "#e8f7f6" : "#ffffff",
                    color: sourceType === "web" ? "#0e8587" : "#475569",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>👤</span>
                  <span>Akun Web Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("telegram")}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: sourceType === "telegram" ? "2px solid #0e8587" : "1.5px solid #cbd5e1",
                    backgroundColor: sourceType === "telegram" ? "#e8f7f6" : "#ffffff",
                    color: sourceType === "telegram" ? "#0e8587" : "#475569",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>✈️</span>
                  <span>Pengguna Telegram</span>
                </button>
              </div>
            </div>

            {/* DROPDOWN SELECT ANGGOTA */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                2. Pilih Anggota Tim Software
              </label>

              {sourceType === "web" ? (
                <div>
                  <select
                    value={selectedWebUserId}
                    onChange={(e) => setSelectedWebUserId(e.target.value)}
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
                    <option value="">-- Pilih Akun Web Software --</option>
                    {webUsers.map((u) => {
                      const already = assignedWebUserIds.has(u.id);
                      return (
                        <option key={u.id} value={u.id} disabled={already}>
                          {u.name} ({u.email}) - {u.role?.toUpperCase()} {already ? "✓ [Sudah Terdaftar]" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Daftar akun tim software dan koordinator yang memiliki akses web.
                  </span>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedTeleUserId}
                    onChange={(e) => setSelectedTeleUserId(e.target.value)}
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
                    <option value="">-- Pilih Pengguna Telegram Whitelist --</option>
                    {telegramUsers.map((tg) => {
                      const already = assignedTeleUserIds.has(tg.id);
                      const displayTitle = tg.fullName || tg.full_name || tg.username || tg.telegramId || tg.telegram_id;
                      const userTag = tg.username ? `@${tg.username}` : `ID: ${tg.telegramId || tg.telegram_id}`;
                      return (
                        <option key={tg.id} value={tg.id} disabled={already}>
                          {displayTitle} ({userTag}) {already ? "✓ [Sudah Terdaftar]" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Daftar user Telegram divisi software yang sudah terdaftar di whitelist.
                  </span>
                </div>
              )}
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
                disabled={submitting || fetchingUsers}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  backgroundColor: "#0e8587",
                  color: "#ffffff",
                  cursor: submitting || fetchingUsers ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(14, 133, 135, 0.25)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = "#0b7173";
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = "#0e8587";
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
                    Menambahkan...
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
    </div>
  );
}
