import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function TicketDetailDrawer({
  ticket,
  onClose,
  onUpdateTicket,
  availableUsers = [],
  onAssignMember,
  onRemoveMember,
  onAddHistoryNote,
}) {
  const { user } = useAuth();
  const currentUser = user?.user || user;

  const [selectedStatus, setSelectedStatus] = useState("Open");
  const [handlingNote, setHandlingNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick history note state
  const [quickNote, setQuickNote] = useState("");
  const [savingQuickNote, setSavingQuickNote] = useState(false);

  // Assign team member selector state
  const [isAssignFormOpen, setIsAssignFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isLeadRole, setIsLeadRole] = useState(false);
  const [customAssigneeName, setCustomAssigneeName] = useState("");
  const [customAssigneeRole, setCustomAssigneeRole] = useState("Teknisi");

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status || "Open");
      setHandlingNote("");
      setQuickNote("");
      setIsAssignFormOpen(false);
      setSelectedUserId("");
    }
  }, [ticket]);

  if (!ticket) return null;

  const assignedMembers = ticket.assignees || ticket.assignedMembers || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateTicket(ticket.id, {
        status: selectedStatus.toLowerCase(),
        handlingNote: handlingNote.trim() || undefined,
      });
      setHandlingNote("");
    } catch (err) {
      console.error("Failed to update ticket:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    setSavingQuickNote(true);
    try {
      if (onAddHistoryNote) {
        await onAddHistoryNote(ticket.id, quickNote.trim());
      } else {
        await onUpdateTicket(ticket.id, {
          handlingNote: quickNote.trim(),
        });
      }
      setQuickNote("");
    } catch (err) {
      console.error("Failed to add quick note:", err);
    } finally {
      setSavingQuickNote(false);
    }
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    let memberToAssign = null;

    if (selectedUserId === "custom") {
      if (!customAssigneeName.trim()) return;
      memberToAssign = {
        id: `custom-${Date.now()}`,
        name: customAssigneeName.trim(),
        email: `${customAssigneeName.trim().toLowerCase().replace(/\s+/g, ".")}@widya.com`,
        role: customAssigneeRole,
      };
    } else if (selectedUserId) {
      const found = availableUsers.find((u) => u.id === selectedUserId);
      if (found) {
        memberToAssign = {
          id: found.id,
          userId: found.userId || found.id,
          telegramUserId: found.telegramUserId,
          telegramId: found.telegramId,
          name: found.name,
          email: found.email,
          role: found.role || "TEKNISI",
        };
      }
    }

    if (memberToAssign && onAssignMember) {
      onAssignMember(ticket.id, memberToAssign, isLeadRole || assignedMembers.length === 0);
      setIsAssignFormOpen(false);
      setSelectedUserId("");
      setCustomAssigneeName("");
    }
  };

  const statusOptions = ["Open", "Escalated", "Solved", "Closed"];

  const getStatusButtonColors = (st, isCurrent) => {
    if (!isCurrent) {
      return {
        border: "1px solid var(--border-light)",
        backgroundColor: "#ffffff",
        color: "var(--text-secondary)",
      };
    }
    switch (st) {
      case "Open":
        return {
          border: "1px solid #dc2626",
          backgroundColor: "#fef2f2",
          color: "#dc2626",
        };
      case "Escalated":
      case "Monitor":
        return {
          border: "1px solid #d97706",
          backgroundColor: "#fffbeb",
          color: "#d97706",
        };
      case "Solved":
        return {
          border: "1px solid #16a34a",
          backgroundColor: "#f0fdf4",
          color: "#16a34a",
        };
      case "Closed":
      default:
        return {
          border: "1px solid #475569",
          backgroundColor: "#f8fafc",
          color: "#1e293b",
        };
    }
  };

  const getRoleBadgeStyle = (role) => {
    const r = (role || "").toUpperCase();
    if (r === "ADMIN") return { bg: "#f3e8ff", color: "#7e22ce", label: "Admin" };
    if (r === "COORDINATOR") return { bg: "#e0f2fe", color: "#0369a1", label: "Koordinator" };
    return { bg: "#ecfdf5", color: "#047857", label: "Teknisi" };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        backgroundColor: "rgba(11, 30, 39, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          height: "100%",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
          animation: "slideInRight 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header (Dark Navy) */}
        <div
          style={{
            backgroundColor: "var(--sidebar-bg)",
            padding: "20px 24px",
            borderBottom: "1px solid #152c38",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                margin: 0,
                fontFamily: "monospace",
              }}
            >
              {ticket.id}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              {/* Status pill */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  border: ticket.status === "Open" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: ticket.status === "Open" ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.08)",
                  color: ticket.status === "Open" ? "#fca5a5" : "#ffffff",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: ticket.status === "Open" ? "#ef4444" : "#22c55e",
                  }}
                />
                {ticket.status}
              </span>

              {/* Severity dot */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor:
                      ticket.severity === "Tinggi" ? "#ef4444" : ticket.severity === "Sedang" ? "#f59e0b" : "#3b82f6",
                  }}
                />
                {ticket.severity}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup detail tiket"
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Card 1: Informasi unit */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "14px" }}>
              Informasi Unit
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Unit</span>
                <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-dark)", fontFamily: "monospace" }}>
                  {ticket.unit} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({ticket.unitType || "portable"})</span>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Lokasi</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dark)" }}>
                  {ticket.location}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Client</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dark)" }}>
                  {ticket.client}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Component / Failure</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dark)" }}>
                    {ticket.component}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--primary-teal)", fontWeight: 600, marginTop: "2px", fontFamily: "monospace" }}>
                    {ticket.failureCode} {ticket.failureName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Laporan & Kerusakan */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "14px" }}>
              Laporan Kerusakan
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                  Deskripsi Kerusakan
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-dark)", marginTop: "3px", lineHeight: 1.4 }}>
                  {ticket.description || "-"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                  Penanganan Terakhir
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-dark)", marginTop: "3px", lineHeight: 1.4 }}>
                  {ticket.handling || "Belum ada penanganan"}
                </p>
              </div>
            </div>

            {/* Meta Footer */}
            <div
              style={{
                borderTop: "1px solid var(--border-light)",
                paddingTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Dibuat: </span>
                <span style={{ fontWeight: 600 }}>{ticket.createdDateTimeText}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Durasi: </span>
                <span style={{ fontWeight: 600 }}>{ticket.durationText || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Sumber: </span>
                <span style={{ fontWeight: 600 }}>{ticket.source || "telegram"}</span>
              </div>
              <div style={{ width: "100%" }}>
                <span style={{ color: "var(--text-muted)" }}>Pelapor: </span>
                <span style={{ fontWeight: 600, color: "var(--primary-teal)" }}>{ticket.reporter || "-"}</span>
              </div>
            </div>
          </div>

          {/* CARD 3: TIM PENANGANAN TIKET (PIC & ASSIGNEES) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
                  Tim Penanganan (PIC)
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Anggota yang ditugaskan menangani tiket ini
                </span>
              </div>

              {!isAssignFormOpen && (
                <button
                  type="button"
                  onClick={() => setIsAssignFormOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #0e8587",
                    backgroundColor: "#f0fdfa",
                    color: "#0e8587",
                    fontSize: "12px",
                    fontWeight: 650,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#ccfbf1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0fdfa";
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Tim
                </button>
              )}
            </div>

            {/* List Assigned Members */}
            {assignedMembers.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                  Tiket ini belum memiliki penanggung jawab (PIC).
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignFormOpen(true)}
                  style={{
                    marginTop: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0e8587",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  + Tugaskan anggota tim sekarang
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: isAssignFormOpen ? "14px" : "0" }}>
                {assignedMembers.map((member) => {
                  const roleStyle = getRoleBadgeStyle(member.role);
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "#0e8587",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textTransform: "uppercase",
                          }}
                        >
                          {(member.name || "U").slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-dark)" }}>
                              {member.name}
                            </span>
                            {(member.isLead || member.isLeader) && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                PIC Utama
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: roleStyle.bg,
                                color: roleStyle.color,
                              }}
                            >
                              {roleStyle.label}
                            </span>
                            {member.email && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                · {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      {onRemoveMember && (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(ticket.id, member.id, member.name)}
                          title={`Hapus ${member.name} dari penanganan`}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.12s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.backgroundColor = "#fee2e2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#94a3b8";
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FORM ASSIGN ANGGOTA TIM (EXPANDABLE) */}
            {isAssignFormOpen && (
              <form
                onSubmit={handleAssignSubmit}
                style={{
                  marginTop: "12px",
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-dark)" }}>
                  Pilih Anggota Tim untuk Ditugaskan:
                </div>

                {/* Dropdown User */}
                <div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      color: "var(--text-dark)",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Pilih dari Daftar Pengguna Sistem --</option>
                    {availableUsers.map((u) => {
                      const isAssigned = assignedMembers.some((m) => m.id === u.id || m.email === u.email);
                      return (
                        <option key={u.id} value={u.id} disabled={isAssigned}>
                          {u.name} ({u.role || "Teknisi"}) {isAssigned ? "- Sudah ditugaskan" : ""}
                        </option>
                      );
                    })}
                    <option value="custom">+ Input Nama Anggota Lain...</option>
                  </select>
                </div>

                {/* Custom Name input if 'custom' selected */}
                {selectedUserId === "custom" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Nama lengkap teknisi..."
                      value={customAssigneeName}
                      onChange={(e) => setCustomAssigneeName(e.target.value)}
                      required
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                    <select
                      value={customAssigneeRole}
                      onChange={(e) => setCustomAssigneeRole(e.target.value)}
                      style={{
                        padding: "8px 8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        backgroundColor: "#ffffff",
                        outline: "none",
                      }}
                    >
                      <option value="Teknisi">Teknisi</option>
                      <option value="Koordinator">Koordinator</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                )}

                {/* Checkbox PIC Utama */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "var(--text-dark)" }}>
                  <input
                    type="checkbox"
                    checked={isLeadRole}
                    onChange={(e) => setIsLeadRole(e.target.checked)}
                    style={{ accentColor: "#0e8587" }}
                  />
                  <span>Jadikan sebagai <strong>PIC Utama</strong> penanganan tiket</span>
                </label>

                {/* Action buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignFormOpen(false);
                      setSelectedUserId("");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedUserId || (selectedUserId === "custom" && !customAssigneeName.trim())}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "#0e8587",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                      opacity: !selectedUserId ? 0.6 : 1,
                    }}
                  >
                    Tugaskan ke Tiket
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* CARD 4: UBAH STATUS / TAMBAH CATATAN PENANGANAN */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "14px" }}>
              Ubah Status / Catatan Penanganan
            </h3>

            {/* Status baru selection */}
            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Status Baru
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {statusOptions.map((st) => {
                  const isCurrent = selectedStatus === st;
                  const styleProps = getStatusButtonColors(st, isCurrent);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      style={{
                        padding: "7px 4px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.12s ease",
                        ...styleProps,
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catatan penanganan */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Catatan Penanganan Lapangan
              </span>
              <textarea
                rows={3}
                value={handlingNote}
                onChange={(e) => setHandlingNote(e.target.value)}
                placeholder="Contoh: Modul sensor dibersihkan dan konektor dipasang ulang..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "13px",
                  color: "var(--text-dark)",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-light)")}
              />
            </div>

            {/* Submit Action */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  backgroundColor: "var(--primary-teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = "var(--primary-teal-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = "var(--primary-teal)";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {saving ? "Menyimpan..." : "Simpan Perubahan Status"}
              </button>

              <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                Perubahan status & penanganan langsung dicatat ke Riwayat Tiket.
              </span>
            </div>
          </div>

          {/* CARD 5: RIWAYAT TIKET (TICKET HISTORY & TIMELINE) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "18px 20px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
                Riwayat Tiket ({ticket.history?.length || 0})
              </h3>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Jejak perubahan status, penugasan, dan catatan teknisi
              </span>
            </div>

            {/* Form Cepat Tambah Catatan Riwayat */}
            <form
              onSubmit={handleAddQuickNote}
              style={{
                marginBottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                backgroundColor: "#f8fafc",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0e8587" strokeWidth="2.5">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-dark)" }}>
                  Tambah Log Progres / Catatan Riwayat
                </span>
              </div>
              <textarea
                rows={2}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Tulis update riwayat penanganan di lapangan..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  color: "var(--text-dark)",
                  outline: "none",
                  resize: "vertical",
                  backgroundColor: "#ffffff",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal)")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={!quickNote.trim() || savingQuickNote}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#0e8587",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 650,
                    cursor: !quickNote.trim() || savingQuickNote ? "not-allowed" : "pointer",
                    opacity: !quickNote.trim() || savingQuickNote ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {savingQuickNote ? "Menyimpan..." : "Kirim Catatan"}
                </button>
              </div>
            </form>

            {/* Timeline Items */}
            {(!ticket.history || ticket.history.length === 0) ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "12.5px" }}>
                Belum ada aktivitas riwayat yang tercatat untuk tiket ini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0px", position: "relative" }}>
                {/* Vertical connecting line */}
                <div
                  style={{
                    position: "absolute",
                    left: "13px",
                    top: "14px",
                    bottom: "14px",
                    width: "2px",
                    backgroundColor: "#e2e8f0",
                    zIndex: 0,
                  }}
                />

                {ticket.history.map((h, idx) => {
                  const isAssignAction = (h.action || "").toLowerCase().includes("tugaskan") || (h.action || "").toLowerCase().includes("tim");
                  const isStatusAction = (h.action || "").toLowerCase().includes("status");

                  let nodeColor = "#0e8587";
                  let badgeBg = "#f0fdfa";
                  let badgeColor = "#0e8587";
                  let typeLabel = "Catatan";

                  if (isAssignAction) {
                    nodeColor = "#3b82f6";
                    badgeBg = "#eff6ff";
                    badgeColor = "#1d4ed8";
                    typeLabel = "Penugasan Tim";
                  } else if (isStatusAction) {
                    nodeColor = "#f59e0b";
                    badgeBg = "#fffbeb";
                    badgeColor = "#b45309";
                    typeLabel = "Status";
                  }

                  return (
                    <div
                      key={h.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        position: "relative",
                        zIndex: 1,
                        paddingBottom: idx === ticket.history.length - 1 ? "0" : "16px",
                      }}
                    >
                      {/* Timeline circle node */}
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "#ffffff",
                          border: `2px solid ${nodeColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: nodeColor,
                          }}
                        />
                      </div>

                      {/* Content block */}
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid var(--border-light)",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {typeLabel}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-dark)" }}>
                              {h.author || "Sistem"}
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {h.timestamp}
                          </span>
                        </div>

                        <div style={{ fontSize: "12.5px", color: "#334155", lineHeight: 1.45, fontWeight: 500 }}>
                          {h.action}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
