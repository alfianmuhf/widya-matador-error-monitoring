import { useMemo } from "react";

export default function TicketDetailDrawer({ ticket, onClose }) {
  if (!ticket) return null;

  const assignedMembers = ticket.assignees || ticket.assignedMembers || [];

  // Urutkan riwayat dari versi terbaru ke terlama (descending) untuk kemudahan membaca kronologi
  const sortedHistory = useMemo(() => {
    if (!ticket.history || !Array.isArray(ticket.history)) return [];
    return [...ticket.history].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  }, [ticket.history]);

  // Deteksi tim penanggung jawab berdasarkan siklus hidup & status tiket:
  // - v0 status open: Tim Aftersales
  // - status escalated: Tim Software
  // - status solved: dideteksi apakah sebelum solved adalah escalated (Software) atau open (Aftersales)
  const handlerInfo = useMemo(() => {
    const rawStatus = (ticket.rawStatus || ticket.status || "").toLowerCase();

    if (rawStatus === "open") {
      return {
        team: "Tim Aftersales",
        badgeBg: "#fef2f2",
        badgeBorder: "#fecaca",
        badgeColor: "#dc2626",
        icon: "🛠️",
        description: "Tiket sedang ditangani oleh Tim Aftersales di lapangan.",
      };
    }

    if (rawStatus === "escalated") {
      return {
        team: "Tim Software",
        badgeBg: "#fffbeb",
        badgeBorder: "#fde68a",
        badgeColor: "#b45309",
        icon: "💻",
        description: "Tiket telah dieskalasi ke Tim Software untuk investigasi teknis & perbaikan sistem.",
      };
    }

    if (rawStatus === "solved") {
      // Periksa riwayat sebelum solved untuk mengetahui siapa yang menyelesaikan
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
        badgeBg: "#f0fdf4",
        badgeBorder: "#bbf7d0",
        badgeColor: "#15803d",
        icon: "✅",
        description: `Kendala unit berhasil diselesaikan dan status operasional kembali normal oleh ${solvedByTeam}.`,
      };
    }

    return {
      team: "Tim Aftersales",
      badgeBg: "#f8fafc",
      badgeBorder: "#e2e8f0",
      badgeColor: "#475569",
      icon: "ℹ️",
      description: "Menunggu penanganan lebih lanjut.",
    };
  }, [ticket]);

  // Format Status Badge
  const getStatusBadge = (st) => {
    const s = (st || "").toLowerCase();
    if (s === "open") {
      return {
        bg: "#fef2f2",
        border: "#fecaca",
        color: "#dc2626",
        dot: "#ef4444",
        label: "open",
      };
    }
    if (s === "escalated") {
      return {
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#b45309",
        dot: "#f59e0b",
        label: "escalated",
      };
    }
    if (s === "solved") {
      return {
        bg: "#f0fdf4",
        border: "#bbf7d0",
        color: "#15803d",
        dot: "#22c55e",
        label: "solved",
      };
    }
    return {
      bg: "#f8fafc",
      border: "#e2e8f0",
      color: "#475569",
      dot: "#64748b",
      label: s || "open",
    };
  };

  // Format Severity Badge
  const getSeverityBadge = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "tinggi") {
      return { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", label: "tinggi" };
    }
    if (s === "sedang") {
      return { bg: "#fffbeb", border: "#fde68a", color: "#b45309", label: "sedang" };
    }
    return { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", label: "rendah" };
  };

  const statusBadge = getStatusBadge(ticket.rawStatus || ticket.status);
  const severityBadge = getSeverityBadge(ticket.rawSeverity || ticket.severity);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(11, 30, 39, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      {/* Drawer Container (Lebar & Lega: max 860px) */}
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          height: "100%",
          backgroundColor: "#f8fafc",
          boxShadow: "-12px 0 35px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 10001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div
          style={{
            backgroundColor: "#0b1e27",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
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
                  padding: "3px 8px",
                  borderRadius: "5px",
                }}
              >
                Detail Tiket Gangguan
              </span>

              {/* Version Pill */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#f1f5f9",
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  padding: "3px 9px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                Versi {ticket.currentVersion ?? ticket.current_version ?? 0}
              </span>
            </div>

            <h2
              style={{
                fontSize: "20px",
                fontWeight: 750,
                color: "#ffffff",
                marginTop: "8px",
                letterSpacing: "-0.01em",
                fontFamily: "monospace",
              }}
            >
              {ticket.id}
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
              {/* Status Pill */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
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
                    width: "7px",
                    height: "7px",
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
                  gap: "6px",
                  padding: "4px 10px",
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
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup detail tiket"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* BANNER: INFORMASI TIM PENANGGUNG JAWAB SAAT INI */}
          <div
            style={{
              backgroundColor: handlerInfo.badgeBg,
              border: `1px solid ${handlerInfo.badgeBorder}`,
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>{handlerInfo.icon}</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: handlerInfo.badgeColor }}>
                  Tim Penanggung Jawab Saat Ini
                </div>
                <div style={{ fontSize: "15px", fontWeight: 750, color: "var(--text-dark)", marginTop: "2px" }}>
                  {handlerInfo.team}
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px", margin: 0 }}>
                  {handlerInfo.description}
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                fontWeight: 650,
                color: handlerInfo.badgeColor,
                backgroundColor: "#ffffff",
                padding: "6px 14px",
                borderRadius: "8px",
                border: `1px solid ${handlerInfo.badgeBorder}`,
                whiteSpace: "nowrap",
              }}
            >
              Versi Terkini: v{ticket.currentVersion ?? ticket.current_version ?? 0}
            </div>
          </div>

          {/* CARD INFORMASI PENANGGUNG JAWAB AFTERSALES (JIKA TERSEDIA) */}
          {ticket.aftersalesUser && (
            <div
              style={{
                backgroundColor: "#eff6ff",
                borderRadius: "12px",
                border: "1px solid #bfdbfe",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                boxShadow: "0 1px 2px rgba(37, 99, 235, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#dbeafe",
                    color: "#1d4ed8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  🛠️
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                    Penanggung Jawab Aftersales
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 750, color: "#0f172a", marginTop: "1px" }}>
                    {ticket.aftersalesUser.name}{" "}
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
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
                  borderRadius: "6px",
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  whiteSpace: "nowrap",
                }}
              >
                Owner Open
              </span>
            </div>
          )}

          {/* CARD 1: DETAIL UPDATE TERAKHIR TIKET */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "20px 22px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
                Detail Update Terakhir Tiket
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Durasi Gangguan: <strong style={{ color: "var(--text-dark)" }}>{ticket.durationText || "—"}</strong>
              </span>
            </div>

            {/* Grid 2 Kolom untuk Informasi Unit & Kerusakan */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              {/* Kolom Kiri: Unit & Site */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: "1px solid #edf2f7",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Informasi Unit & Penempatan
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Unit Code:</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", fontFamily: "monospace" }}>
                    {ticket.unit} <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>({ticket.unitType || "portable"})</span>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Klien:</span>
                  <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-dark)" }}>
                    {ticket.client}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Lokasi Site:</span>
                  <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-dark)" }}>
                    {ticket.location}
                  </span>
                </div>
              </div>

              {/* Kolom Kanan: Komponen & Failure Code */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: "1px solid #edf2f7",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Modul & Kode Kerusakan
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Modul Komponen:</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-dark)" }}>
                    {ticket.component}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Failure Code:</span>
                  <span
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 750,
                      color: "var(--primary-teal)",
                      fontFamily: "monospace",
                      backgroundColor: "var(--primary-teal-light)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {ticket.failureCode}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Nama Failure:</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dark)", textAlign: "right" }}>
                    {ticket.failureName || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Rincian Gejala, Tindakan Terakhir, dan Root Cause */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Deskripsi / Gejala Kerusakan
                </span>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-dark)",
                    marginTop: "4px",
                    lineHeight: 1.5,
                    backgroundColor: "#f8fafc",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    margin: "4px 0 0 0",
                  }}
                >
                  {ticket.damageDescription || ticket.description || "Tidak ada deskripsi kerusakan."}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Tindakan Penanganan Terakhir (Action Taken)
                </span>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-dark)",
                    marginTop: "4px",
                    lineHeight: 1.5,
                    backgroundColor: "#f0fdf4",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    margin: "4px 0 0 0",
                  }}
                >
                  {ticket.actionTaken || ticket.handling || "Belum ada tindakan penanganan yang dicatat."}
                </p>
              </div>

              {Boolean(ticket.rootCause || ticket.cause) && (
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Akar Penyebab (Root Cause)
                  </span>
                  <p
                    style={{
                      fontSize: "13.5px",
                      color: "var(--text-dark)",
                      marginTop: "4px",
                      lineHeight: 1.5,
                      backgroundColor: "#fffbeb",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #fde68a",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {ticket.rootCause || ticket.cause}
                  </p>
                </div>
              )}
            </div>

            {/* Meta Footer: Pelapor & Waktu Dibuat */}
            <div
              style={{
                borderTop: "1px solid var(--border-light)",
                marginTop: "16px",
                paddingTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "12.5px",
                color: "var(--text-secondary)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Pembuat Tiket (v0): </span>
                <strong style={{ color: "var(--text-dark)" }}>{ticket.reporter || "-"}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-muted)" }}>Waktu Dibuat: </span>
                <strong style={{ color: "var(--text-dark)" }}>{ticket.createdDateTimeText}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-muted)" }}>Sumber: </span>
                <span
                  style={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "11px",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    backgroundColor: "#e2e8f0",
                    color: "#334155",
                  }}
                >
                  {ticket.source || "dashboard"}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2: ANGGOTA TIM SOFTWARE (JIKA ADA) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "20px 22px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
                  Anggota Tim Software ({assignedMembers.length})
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Anggota tim software yang ditugaskan / mengklaim tiket ini
                </span>
              </div>

              {assignedMembers.some((m) => m.isLeader) && (
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: "9999px",
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  👑 Leader Terdaftar
                </span>
              )}
            </div>

            {assignedMembers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                {(ticket.rawStatus || ticket.status || "").toLowerCase() === "escalated" ? (
                  <div>
                    <span style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>⏳</span>
                    <strong>Tiket berstatus Escalated.</strong> Belum ada anggota tim Software yang mengklaim atau ditugaskan pada tiket ini.
                  </div>
                ) : (
                  <div>
                    <span style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>🛠️</span>
                    Tiket sedang ditangani secara internal oleh <strong>Tim Aftersales</strong> (belum dieskalasi ke tim Software).
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "12px",
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
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        backgroundColor: isLeader ? "#f0fdfa" : "#f8fafc",
                        border: isLeader ? "1.5px solid #0e8587" : "1px solid var(--border-light)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          backgroundColor: isLeader ? "#0e8587" : "#e2e8f0",
                          color: isLeader ? "#ffffff" : "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 750,
                          fontSize: "14px",
                          flexShrink: 0,
                        }}
                      >
                        {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 700,
                              color: "var(--text-dark)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {member.name || "Nama Pengguna"}
                          </span>
                        </div>

                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>
                          {member.identifier || member.email || "-"}
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          {isLeader ? (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 750,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#0e8587",
                                color: "#ffffff",
                              }}
                            >
                              👑 Leader Software
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 650,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#e2e8f0",
                                color: "#475569",
                              }}
                            >
                              Anggota Tim Software
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

          {/* CARD 3: RIWAYAT PERUBAHAN TIKET (TICKET HISTORY & TIMELINE) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              padding: "20px 22px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
                  Linimasa Riwayat Tiket ({sortedHistory.length} Versi)
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Dimulai dari Versi 0 (Tiket Dibuat)
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", display: "block" }}>
                Rekam jejak setiap perubahan status, penanganan, dan tindakan pada tiket
              </span>
            </div>

            {sortedHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "13px" }}>
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
                    backgroundColor: "#e2e8f0",
                    zIndex: 0,
                  }}
                />

                {sortedHistory.map((h, idx) => {
                  const histStatus = getStatusBadge(h.rawStatus || h.status);
                  const histSeverity = getSeverityBadge(h.rawSeverity || h.severity);
                  const isInitialVersion = (h.version === 0);
                  const isCurrentLatest = idx === 0;

                  // Deteksi sumber perubahan dari changedByUserId / changedByTelegramUserId / source
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
                        paddingBottom: idx === sortedHistory.length - 1 ? "0" : "20px",
                      }}
                    >
                      {/* Timeline circle node with version label */}
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          backgroundColor: isCurrentLatest ? "#0e8587" : "#ffffff",
                          color: isCurrentLatest ? "#ffffff" : "#0e8587",
                          border: "2px solid #0e8587",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "12px",
                          fontWeight: 750,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                        }}
                      >
                        v{h.version ?? 0}
                      </div>

                      {/* Content Card Box */}
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: isCurrentLatest ? "#f8fafc" : "#ffffff",
                          borderRadius: "12px",
                          border: isCurrentLatest ? "1.5px solid #0e8587" : "1px solid var(--border-light)",
                          padding: "16px 18px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        {/* Header Riwayat: Versi, Status, Severity, Sumber (Web/Telegram), Waktu */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                            paddingBottom: "10px",
                            borderBottom: "1px solid #edf2f7",
                            marginBottom: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            {/* Chip Versi */}
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 750,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor: isInitialVersion ? "#eff6ff" : "#f1f5f9",
                                color: isInitialVersion ? "#1d4ed8" : "#334155",
                                border: `1px solid ${isInitialVersion ? "#bfdbfe" : "#cbd5e1"}`,
                              }}
                            >
                              {isInitialVersion ? "v0 • Dibuat" : `v${h.version}`}
                            </span>

                            {/* Badge Status */}
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
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

                            {/* Badge Severity */}
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 650,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor: histSeverity.bg,
                                color: histSeverity.color,
                                border: `1px solid ${histSeverity.border}`,
                              }}
                            >
                              severity: {histSeverity.label}
                            </span>

                            {/* Badge Sumber Perubahan (Web vs Telegram) */}
                            {isTeleSource ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: "#f0fdfa",
                                  color: "#0f766e",
                                  border: "1px solid #99f6e4",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                📱 Telegram Bot
                              </span>
                            ) : isWebSource ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                🌐 Web Dashboard
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 650,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: "#f8fafc",
                                  color: "#64748b",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                ⚙️ Sistem
                              </span>
                            )}
                          </div>

                          {/* Waktu update */}
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                            {h.timestamp}
                          </span>
                        </div>

                        {/* Identitas Aktor Pengubah */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Diperbarui oleh:</span>
                          <strong style={{ fontSize: "13px", color: "var(--text-dark)" }}>
                            {h.author || "Sistem"}
                          </strong>
                          {Boolean(h.authorDivision) && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 650,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#e2e8f0",
                                color: "#334155",
                              }}
                            >
                              Divisi: {h.authorDivision}
                            </span>
                          )}
                        </div>

                        {/* Grid Rincian Data Transparansi Versi */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {/* 1. Catatan Log / Notes */}
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                              Catatan Log / Notes:
                            </span>
                            <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "2px", lineHeight: 1.45, fontWeight: 500 }}>
                              {notesText || "—"}
                            </div>
                          </div>

                          {/* 2. Gejala / Damage Description */}
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                              Deskripsi Kerusakan (damage_description):
                            </span>
                            <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "2px", lineHeight: 1.45 }}>
                              {damageText || "—"}
                            </div>
                          </div>

                          {/* 3. Tindakan Penanganan / Action Taken */}
                          <div
                            style={{
                              backgroundColor: actionText ? "#f0fdf4" : "#f8fafc",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: actionText ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: actionText ? "#166534" : "var(--text-muted)",
                                textTransform: "uppercase",
                                display: "block",
                              }}
                            >
                              Tindakan Penanganan (action_taken):
                            </span>
                            <div
                              style={{
                                fontSize: "13px",
                                color: actionText ? "#14532d" : "#64748b",
                                marginTop: "2px",
                                lineHeight: 1.45,
                                fontWeight: actionText ? 500 : 400,
                              }}
                            >
                              {actionText || "Belum ada tindakan khusus yang dicatat pada versi ini."}
                            </div>
                          </div>

                          {/* 4. Akar Masalah / Root Cause */}
                          <div
                            style={{
                              backgroundColor: causeText ? "#fffbeb" : "#f8fafc",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: causeText ? "1px solid #fde68a" : "1px solid #e2e8f0",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: causeText ? "#92400e" : "var(--text-muted)",
                                textTransform: "uppercase",
                                display: "block",
                              }}
                            >
                              Akar Masalah (root_cause):
                            </span>
                            <div
                              style={{
                                fontSize: "13px",
                                color: causeText ? "#78350f" : "#64748b",
                                marginTop: "2px",
                                lineHeight: 1.45,
                                fontWeight: causeText ? 500 : 400,
                              }}
                            >
                              {causeText || "Belum diidentifikasi pada versi ini."}
                            </div>
                          </div>
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
            padding: "16px 24px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid var(--border-light)",
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
              padding: "9px 20px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              fontWeight: 650,
              color: "var(--text-dark)",
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
            Tutup Detail Tiket
          </button>
        </div>
      </div>
    </div>
  );
}
