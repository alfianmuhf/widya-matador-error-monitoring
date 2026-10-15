import { useMemo } from "react";

// =========================================================================
// MINIMALIST LINE SVG ICONS (Clean, Subtle Outline)
// =========================================================================
const IconClock = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconArrowUpRight = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const IconCheckCircle = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconWrench = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconTerminal = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconUser = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconSend = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconMonitor = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconServer = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const IconInfo = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconClose = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Fallback date-time formatter WIB
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

export default function TicketDetailDrawer({ ticket, onClose }) {
  if (!ticket) return null;

  const assignedMembers = ticket.assignees || ticket.assignedMembers || [];

  // Urutkan riwayat dari versi terbaru ke terlama (descending)
  const sortedHistory = useMemo(() => {
    if (!ticket.history || !Array.isArray(ticket.history)) return [];
    return [...ticket.history].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  }, [ticket.history]);

  // Tim penanggung jawab saat ini dengan styling aksen yang elegan & tidak berlebihan
  const handlerInfo = useMemo(() => {
    const rawStatus = (ticket.rawStatus || ticket.status || "").toLowerCase();

    if (rawStatus === "open") {
      return {
        team: "Tim Aftersales",
        borderLeft: "4px solid #2563eb",
        borderColor: "#bfdbfe",
        cardBg: "linear-gradient(90deg, #f0f7ff 0%, #ffffff 100%)",
        iconBg: "#dbeafe",
        iconColor: "#1d4ed8",
        teamColor: "#1e40af",
        badgeBg: "#eff6ff",
        badgeColor: "#1d4ed8",
        badgeBorder: "#bfdbfe",
        icon: <IconWrench size={18} color="#1d4ed8" />,
        description: "Tiket sedang dalam penanganan awal oleh Tim Aftersales di lapangan.",
      };
    }

    if (rawStatus === "escalated") {
      return {
        team: "Tim Software",
        borderLeft: "4px solid #f59e0b",
        borderColor: "#fed7aa",
        cardBg: "linear-gradient(90deg, #fffbeb 0%, #ffffff 100%)",
        iconBg: "#fef3c7",
        iconColor: "#d97706",
        teamColor: "#92400e",
        badgeBg: "#fffbeb",
        badgeColor: "#b45309",
        badgeBorder: "#fde68a",
        icon: <IconTerminal size={18} color="#d97706" />,
        description: "Tiket telah dieskalasi ke Tim Software untuk investigasi teknis & perbaikan sistem.",
      };
    }

    if (rawStatus === "solved") {
      let solvedByTeam = "Tim Aftersales";
      if (ticket.history && Array.isArray(ticket.history)) {
        const sortedAsc = [...ticket.history].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
        const solvedIndex = sortedAsc.findIndex(
          (h) => (h.rawStatus || h.status || "").toLowerCase() === "solved"
        );
        if (solvedIndex > 0) {
          const prevStatus = (
            sortedAsc[solvedIndex - 1].rawStatus || sortedAsc[solvedIndex - 1].status || ""
          ).toLowerCase();
          if (prevStatus === "escalated") {
            solvedByTeam = "Tim Software";
          }
        }
      }

      return {
        team: `Diselesaikan oleh ${solvedByTeam}`,
        borderLeft: "4px solid #10b981",
        borderColor: "#bbf7d0",
        cardBg: "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)",
        iconBg: "#dcfce7",
        iconColor: "#15803d",
        teamColor: "#14532d",
        badgeBg: "#f0fdf4",
        badgeColor: "#15803d",
        badgeBorder: "#bbf7d0",
        icon: <IconCheckCircle size={18} color="#15803d" />,
        description: `Kendala unit berhasil diselesaikan dan operasional kembali normal oleh ${solvedByTeam}.`,
      };
    }

    return {
      team: "Tim Aftersales",
      borderLeft: "4px solid #64748b",
      borderColor: "#cbd5e1",
      cardBg: "#f8fafc",
      iconBg: "#f1f5f9",
      iconColor: "#475569",
      teamColor: "#334155",
      badgeBg: "#f8fafc",
      badgeColor: "#475569",
      badgeBorder: "#cbd5e1",
      icon: <IconInfo size={18} color="#475569" />,
      description: "Menunggu penanganan lebih lanjut.",
    };
  }, [ticket]);

  // Status Badge Helper dengan palet warna bersih & elegan
  const getStatusBadge = (st) => {
    const s = (st || "").toLowerCase();
    if (s === "open") {
      return {
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
        dot: "#3b82f6",
        label: "Open",
      };
    }
    if (s === "escalated") {
      return {
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#b45309",
        dot: "#f59e0b",
        label: "Escalated",
      };
    }
    if (s === "solved") {
      return {
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#15803d",
        dot: "#22c55e",
        label: "Solved",
      };
    }
    return {
      bg: "#f8fafc",
      border: "#cbd5e1",
      color: "#475569",
      dot: "#94a3b8",
      label: s || "Open",
    };
  };

  // Severity Badge Helper dengan warna elegan
  const getSeverityBadge = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "tinggi") {
      return { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "Tinggi" };
    }
    if (s === "sedang") {
      return { bg: "#fffbeb", border: "#fde68a", color: "#b45309", label: "Sedang" };
    }
    return { bg: "#f0fdfa", border: "#ccfbf1", color: "#0f766e", label: "Rendah" };
  };

  const statusBadge = getStatusBadge(ticket.rawStatus || ticket.status);
  const severityBadge = getSeverityBadge(ticket.rawSeverity || ticket.severity);

  // Waktu Lifecycle Tiket (Open, Escalated, Solved)
  const openTimeFormatted =
    ticket.openDateTimeText ||
    ticket.createdDateTimeText ||
    (ticket.open_at || ticket.openAt || ticket.created_at || ticket.createdAt
      ? formatDateTime(ticket.open_at || ticket.openAt || ticket.created_at || ticket.createdAt)
      : "-");

  const hasEscalated = Boolean(ticket.escalated_at || ticket.escalatedAt || ticket.escalatedDateTimeText);
  const escalatedTimeFormatted = hasEscalated
    ? ticket.escalatedDateTimeText || formatDateTime(ticket.escalated_at || ticket.escalatedAt)
    : "-";

  const hasSolved = Boolean(ticket.solved_at || ticket.solvedAt || ticket.solvedDateTimeText || ticket.resolvedAt);
  const solvedTimeFormatted = hasSolved
    ? ticket.solvedDateTimeText || formatDateTime(ticket.solved_at || ticket.solvedAt || ticket.resolvedAt)
    : "-";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      {/* Drawer Container (Minimalis, Rapi, & Elegan) */}
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          height: "100%",
          backgroundColor: "#f8fafc",
          boxShadow: "-12px 0 35px rgba(0, 0, 0, 0.18)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 10001,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer (Deep Navy Minimalist dengan Aksen Cyan) */}
        <div
          style={{
            backgroundColor: "#0b1e27",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  padding: "3px 9px",
                  borderRadius: "5px",
                }}
              >
                Detail Tiket Gangguan
              </span>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#f1f5f9",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  padding: "3px 9px",
                  borderRadius: "5px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                Versi {ticket.currentVersion ?? ticket.current_version ?? 0}
              </span>
            </div>

            <h2
              style={{
                fontSize: "21px",
                fontWeight: 750,
                color: "#ffffff",
                marginTop: "8px",
                letterSpacing: "-0.01em",
                fontFamily: "monospace",
              }}
            >
              {ticket.id}
            </h2>

            {/* Badges: Status & Severity (Aksen Warna Proporsional) */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
              {/* Status Pill with dot */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  border: `1px solid ${statusBadge.border}`,
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.color,
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: statusBadge.dot,
                  }}
                />
                {statusBadge.label}
              </span>

              {/* Severity Pill */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  border: `1px solid ${severityBadge.border}`,
                  backgroundColor: severityBadge.bg,
                  color: severityBadge.color,
                  fontSize: "12px",
                  fontWeight: 650,
                }}
              >
                <span style={{ fontSize: "11px", opacity: 0.8 }}>Severity:</span>
                {severityBadge.label}
              </span>

              <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>
                Durasi: <strong style={{ color: "#f8fafc" }}>{ticket.durationText || "—"}</strong>
              </span>
            </div>
          </div>

          {/* Close button (Line icon) */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup detail tiket"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
            }}
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* ============================================================= */}
          {/* 1. KARTU SIKLUS WAKTU TIKET (OPEN, ESCALATED, SOLVED)           */}
          {/* ============================================================= */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "3px",
                    height: "14px",
                    backgroundColor: "#0e8587",
                    borderRadius: "2px",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155" }}>
                  Jejak Waktu Siklus Tiket
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                Zona Waktu: <strong>WIB (GMT+7)</strong>
              </div>
            </div>

            {/* 3 Kolom Responsif: Open, Escalated, Solved (Warna Aksen Bersih) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {/* Milestone 1: Open (Aksen Lembut Biru) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #bae6fd",
                  borderTop: "3px solid #0284c7",
                  borderRadius: "8px",
                  padding: "13px 15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  boxShadow: "0 1px 2px rgba(2, 132, 199, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      backgroundColor: "#e0f2fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconClock size={13} color="#0284c7" />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0369a1" }}>
                    Tiket Dibuat (Open)
                  </span>
                </div>

                <div style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a", marginTop: "2px" }}>
                  {openTimeFormatted}
                </div>

                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                  Pelapor: <strong style={{ color: "#0284c7" }}>{ticket.reporter || "-"}</strong>
                </div>
              </div>

              {/* Milestone 2: Escalated (Aksen Lembut Amber) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: hasEscalated ? "1px solid #fed7aa" : "1px dashed #cbd5e1",
                  borderTop: hasEscalated ? "3px solid #d97706" : "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "13px 15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  boxShadow: hasEscalated ? "0 1px 2px rgba(217, 119, 6, 0.04)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      backgroundColor: hasEscalated ? "#fef3c7" : "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconArrowUpRight size={13} color={hasEscalated ? "#d97706" : "#94a3b8"} />
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: hasEscalated ? "#b45309" : "#94a3b8",
                    }}
                  >
                    Dieskalasi (Escalated)
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 750,
                    color: hasEscalated ? "#0f172a" : "#94a3b8",
                    marginTop: "2px",
                  }}
                >
                  {escalatedTimeFormatted}
                </div>

                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                  {hasEscalated ? (
                    <span>
                      Durasi Analisis:{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#b45309",
                          backgroundColor: "#fef3c7",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          border: "1px solid #fde68a",
                        }}
                      >
                        {ticket.timeToAnalysisText && ticket.timeToAnalysisText !== "-" ? ticket.timeToAnalysisText : "-"}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Menunggu eskalasi</span>
                  )}
                </div>
              </div>

              {/* Milestone 3: Solved (Aksen Lembut Emerald) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: hasSolved ? "1px solid #bbf7d0" : "1px dashed #cbd5e1",
                  borderTop: hasSolved ? "3px solid #16a34a" : "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "13px 15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  boxShadow: hasSolved ? "0 1px 2px rgba(22, 163, 74, 0.04)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      backgroundColor: hasSolved ? "#dcfce7" : "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconCheckCircle size={13} color={hasSolved ? "#16a34a" : "#94a3b8"} />
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: hasSolved ? "#15803d" : "#94a3b8",
                    }}
                  >
                    Diselesaikan (Solved)
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 750,
                    color: hasSolved ? "#0f172a" : "#94a3b8",
                    marginTop: "2px",
                  }}
                >
                  {solvedTimeFormatted}
                </div>

                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                  {hasSolved ? (
                    <span>
                      Durasi Solved:{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#15803d",
                          backgroundColor: "#dcfce7",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        {ticket.timeToSolveText && ticket.timeToSolveText !== "-" ? ticket.timeToSolveText : "-"}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Dalam penanganan</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 2. BANNER: TIM PENANGGUNG JAWAB SAAT INI (AKSEN ELEGAN)       */}
          {/* ============================================================= */}
          <div
            style={{
              background: handlerInfo.cardBg,
              border: `1px solid ${handlerInfo.borderColor}`,
              borderLeft: handlerInfo.borderLeft,
              borderRadius: "10px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: handlerInfo.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {handlerInfo.icon}
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: handlerInfo.teamColor }}>
                  Tim Penanggung Jawab Saat Ini
                </div>
                <div style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", marginTop: "1px" }}>
                  {handlerInfo.team}
                </div>
                <p style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px", margin: 0 }}>
                  {handlerInfo.description}
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: handlerInfo.badgeColor,
                backgroundColor: handlerInfo.badgeBg,
                padding: "3px 9px",
                borderRadius: "5px",
                border: `1px solid ${handlerInfo.badgeBorder}`,
                whiteSpace: "nowrap",
              }}
            >
              v{ticket.currentVersion ?? ticket.current_version ?? 0}
            </div>
          </div>

          {/* ============================================================= */}
          {/* 3. PENANGGUNG JAWAB AFTERSALES (AKSEN BIRU HALUS)             */}
          {/* ============================================================= */}
          {ticket.aftersalesUser && (
            <div
              style={{
                background: "linear-gradient(90deg, #f0f7ff 0%, #ffffff 100%)",
                borderRadius: "10px",
                border: "1px solid #bfdbfe",
                borderLeft: "4px solid #0284c7",
                padding: "13px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                boxShadow: "0 1px 2px rgba(2, 132, 199, 0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={15} color="#0284c7" />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                    Penanggung Jawab Aftersales
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 750, color: "#0f172a", marginTop: "1px" }}>
                    {ticket.aftersalesUser.name}{" "}
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                      ({ticket.aftersalesUser.email})
                    </span>
                  </div>
                  {ticket.aftersalesUser.telegramUser?.username && (
                    <div style={{ fontSize: "11.5px", color: "#0284c7", marginTop: "1px" }}>
                      Telegram: @{ticket.aftersalesUser.telegramUser.username}
                    </div>
                  )}
                </div>
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#e0f2fe",
                  color: "#0369a1",
                  border: "1px solid #bae6fd",
                  whiteSpace: "nowrap",
                }}
              >
                Owner Tiket
              </span>
            </div>
          )}

          {/* ============================================================= */}
          {/* 4. DETAIL UPDATE TERAKHIR TIKET (BERSIH & ELEGAN)              */}
          {/* ============================================================= */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "3px",
                    height: "14px",
                    backgroundColor: "#0e8587",
                    borderRadius: "2px",
                  }}
                />
                <h3 style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                  Informasi Teknis & Kerusakan
                </h3>
              </div>
            </div>

            {/* Grid 2 Kolom untuk Informasi Unit & Kerusakan (Netral & Bersih) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "12px",
                paddingBottom: "14px",
                borderBottom: "1px solid #edf2f7",
              }}
            >
              {/* Kolom Kiri: Unit & Site */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Informasi Unit & Penempatan
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Unit Code:</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 750, color: "#0f172a", fontFamily: "monospace" }}>
                    {ticket.unit} <span style={{ fontWeight: 400, color: "#64748b" }}>({ticket.unitType || "portable"})</span>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Klien:</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#0f172a" }}>
                    {ticket.client || "-"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Lokasi Site:</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#0f172a" }}>
                    {ticket.location || "-"}
                  </span>
                </div>
              </div>

              {/* Kolom Kanan: Komponen & Failure Code */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Modul & Kode Kerusakan
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Modul Komponen:</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 750, color: "#0f172a" }}>
                    {ticket.component}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Failure Code:</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "#0f766e",
                      fontFamily: "monospace",
                      backgroundColor: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      padding: "2px 7px",
                      borderRadius: "4px",
                    }}
                  >
                    {ticket.failureCode}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Nama Failure:</span>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
                    {ticket.failureName || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Rincian Gejala, Tindakan Terakhir, dan Root Cause (Aksen Warna Hanya di Titik Penting) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              {/* 1. Deskripsi Kerusakan (Netral & Rapi) */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Deskripsi / Gejala Kerusakan
                </span>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#0f172a",
                    marginTop: "4px",
                    lineHeight: 1.5,
                    backgroundColor: "#f8fafc",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    margin: "4px 0 0 0",
                  }}
                >
                  {ticket.damageDescription || ticket.description || "Tidak ada deskripsi kerusakan."}
                </p>
              </div>

              {/* 2. Tindakan Penanganan (Aksen Hijau Lembut) */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>
                  Tindakan Penanganan Terakhir (Action Taken)
                </span>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#14532d",
                    marginTop: "4px",
                    lineHeight: 1.5,
                    backgroundColor: "#f0fdf4",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                    borderLeft: "3.5px solid #16a34a",
                    margin: "4px 0 0 0",
                  }}
                >
                  {ticket.actionTaken || ticket.handling || "Belum ada tindakan penanganan yang dicatat."}
                </p>
              </div>

              {/* 3. Akar Masalah (Aksen Amber Lembut) */}
              {Boolean(ticket.rootCause || ticket.cause) && (
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                    Akar Penyebab (Root Cause)
                  </span>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#78350f",
                      marginTop: "4px",
                      lineHeight: 1.5,
                      backgroundColor: "#fffbeb",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #fde68a",
                      borderLeft: "3.5px solid #d97706",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {ticket.rootCause || ticket.cause}
                  </p>
                </div>
              )}
            </div>

            {/* Meta Footer */}
            <div
              style={{
                borderTop: "1px solid #edf2f7",
                marginTop: "14px",
                paddingTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              <div>
                <span>Pembuat Tiket: </span>
                <strong style={{ color: "#0f172a" }}>{ticket.reporter || "-"}</strong>
              </div>

              <div>
                <span>Sumber Masuk: </span>
                <span
                  style={{
                    fontWeight: 650,
                    textTransform: "uppercase",
                    fontSize: "11px",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {ticket.source || "dashboard"}
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 5. ANGGOTA TIM SOFTWARE                                       */}
          {/* ============================================================= */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "3px",
                    height: "14px",
                    backgroundColor: "#0e8587",
                    borderRadius: "2px",
                  }}
                />
                <h3 style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                  Tim Penanganan Software ({assignedMembers.length})
                </h3>
              </div>

              {assignedMembers.some((m) => m.isLeader) && (
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "#f0fdfa",
                    color: "#0f766e",
                    border: "1px solid #99f6e4",
                  }}
                >
                  Leader Terdaftar
                </span>
              )}
            </div>

            {assignedMembers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  color: "#64748b",
                  fontSize: "12.5px",
                }}
              >
                {(ticket.rawStatus || ticket.status || "").toLowerCase() === "escalated" ? (
                  <div>
                    <strong style={{ color: "#d97706" }}>Tiket berstatus Escalated.</strong> Belum ada anggota tim Software yang mengklaim tiket ini.
                  </div>
                ) : (
                  <div>
                    Tiket sedang ditangani secara internal oleh <strong>Tim Aftersales</strong> (belum dieskalasi ke tim Software).
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "10px",
                }}
              >
                {assignedMembers.map((member, idx) => {
                  const isLeader = Boolean(member.isLeader);
                  return (
                    <div
                      key={member.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        backgroundColor: isLeader ? "#f0fdfa" : "#ffffff",
                        border: isLeader ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                        boxShadow: isLeader ? "0 1px 3px rgba(14, 133, 135, 0.08)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          backgroundColor: isLeader ? "#0e8587" : "#e2e8f0",
                          color: isLeader ? "#ffffff" : "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
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
                            {member.name || "Nama Pengguna"}
                          </span>
                        </div>

                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                          {member.identifier || member.email || "-"}
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          {isLeader ? (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 750,
                                padding: "2px 7px",
                                borderRadius: "3px",
                                backgroundColor: "#0e8587",
                                color: "#ffffff",
                              }}
                            >
                              LEADER
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: "3px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              Anggota Tim
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* 6. LINIMASA RIWAYAT TIKET (BERSIH DENGAN AKSEN STATUS)         */}
          {/* ============================================================= */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "3px",
                      height: "14px",
                      backgroundColor: "#0e8587",
                      borderRadius: "2px",
                    }}
                  />
                  <h3 style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                    Linimasa Riwayat Tiket ({sortedHistory.length} Versi)
                  </h3>
                </div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Dimulai dari Versi 0
                </span>
              </div>
            </div>

            {sortedHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: "12.5px" }}>
                Belum ada data riwayat yang tercatat untuk tiket ini.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0px", position: "relative" }}>
                {/* Vertical connecting line */}
                <div
                  style={{
                    position: "absolute",
                    left: "17px",
                    top: "16px",
                    bottom: "16px",
                    width: "2px",
                    backgroundColor: "#cbd5e1",
                    zIndex: 0,
                  }}
                />

                {sortedHistory.map((h, idx) => {
                  const histStatus = getStatusBadge(h.rawStatus || h.status);
                  const histSeverity = getSeverityBadge(h.rawSeverity || h.severity);
                  const isInitialVersion = h.version === 0;
                  const isCurrentLatest = idx === 0;

                  const isWebSource = Boolean(h.changedByUserId || h.source === "web" || h.source === "dashboard");
                  const isTeleSource = Boolean(h.changedByTelegramUserId || h.source === "telegram");

                  const damageText = h.damageDescription || h.damage_description || null;
                  const actionText = h.actionTaken || h.action_taken || null;
                  const causeText = h.rootCause || h.root_cause || null;
                  const notesText = h.notes || h.action || null;

                  return (
                    <div
                      key={h.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        position: "relative",
                        zIndex: 1,
                        paddingBottom: idx === sortedHistory.length - 1 ? "0" : "18px",
                      }}
                    >
                      {/* Timeline circle node */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: isCurrentLatest ? "#0e8587" : "#ffffff",
                          color: isCurrentLatest ? "#ffffff" : "#0e8587",
                          border: "2px solid #0e8587",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "11.5px",
                          fontWeight: 750,
                          boxShadow: isCurrentLatest ? "0 0 0 4px rgba(14, 133, 135, 0.15)" : "none",
                        }}
                      >
                        v{h.version ?? 0}
                      </div>

                      {/* Content Card Box (Netral dengan Aksen Status Bersih) */}
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: isCurrentLatest ? "#f8fafc" : "#ffffff",
                          borderRadius: "8px",
                          border: isCurrentLatest ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                          borderLeft: isCurrentLatest ? "3.5px solid #0e8587" : "1px solid #e2e8f0",
                          padding: "14px 16px",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        {/* Header Riwayat */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid #edf2f7",
                            marginBottom: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: isInitialVersion ? "#eff6ff" : "#f1f5f9",
                                color: isInitialVersion ? "#1d4ed8" : "#334155",
                                border: `1px solid ${isInitialVersion ? "#bfdbfe" : "#cbd5e1"}`,
                              }}
                            >
                              {isInitialVersion ? "v0 • Dibuat" : `v${h.version}`}
                            </span>

                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: histStatus.bg,
                                color: histStatus.color,
                                border: `1px solid ${histStatus.border}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span
                                style={{
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  backgroundColor: histStatus.dot,
                                }}
                              />
                              {histStatus.label}
                            </span>

                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 650,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: histSeverity.bg,
                                color: histSeverity.color,
                                border: `1px solid ${histSeverity.border}`,
                              }}
                            >
                              {histSeverity.label}
                            </span>

                            {/* Sumber Perubahan (Line Icon & Soft Color Pill) */}
                            {isTeleSource ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 650,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  backgroundColor: "#f0fdfa",
                                  color: "#0f766e",
                                  border: "1px solid #99f6e4",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <IconSend size={11} color="#0f766e" />
                                Telegram
                              </span>
                            ) : isWebSource ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 650,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <IconMonitor size={11} color="#1d4ed8" />
                                Web
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  backgroundColor: "#f8fafc",
                                  color: "#475569",
                                  border: "1px solid #e2e8f0",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <IconServer size={11} color="#475569" />
                                Sistem
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            {h.timestamp}
                          </span>
                        </div>

                        {/* Aktor Pengubah */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Oleh:</span>
                          <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>
                            {h.author || "Sistem"}
                          </strong>
                          {Boolean(h.authorDivision) && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: "3px",
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              Divisi: {h.authorDivision}
                            </span>
                          )}
                        </div>

                        {/* Rincian data dengan aksen warna halus pada tindakan & akar masalah saja */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {notesText && (
                            <div style={{ backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block" }}>
                                Catatan:
                              </span>
                              <div style={{ fontSize: "12.5px", color: "#0f172a", marginTop: "2px" }}>
                                {notesText}
                              </div>
                            </div>
                          )}

                          {damageText && (
                            <div style={{ backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block" }}>
                                Deskripsi Kerusakan:
                              </span>
                              <div style={{ fontSize: "12.5px", color: "#0f172a", marginTop: "2px" }}>
                                {damageText}
                              </div>
                            </div>
                          )}

                          {actionText && (
                            <div style={{ backgroundColor: "#f0fdf4", padding: "8px 10px", borderRadius: "6px", border: "1px solid #bbf7d0", borderLeft: "3px solid #16a34a" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", textTransform: "uppercase", display: "block" }}>
                                Tindakan Penanganan:
                              </span>
                              <div style={{ fontSize: "12.5px", color: "#14532d", marginTop: "2px" }}>
                                {actionText}
                              </div>
                            </div>
                          )}

                          {causeText && (
                            <div style={{ backgroundColor: "#fffbeb", padding: "8px 10px", borderRadius: "6px", border: "1px solid #fde68a", borderLeft: "3px solid #d97706" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#b45309", textTransform: "uppercase", display: "block" }}>
                                Akar Masalah:
                              </span>
                              <div style={{ fontSize: "12.5px", color: "#78350f", marginTop: "2px" }}>
                                {causeText}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Drawer */}
        <div
          style={{
            padding: "14px 24px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
