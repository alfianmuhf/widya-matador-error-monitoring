import { useState, useEffect } from "react";

export default function TicketDetailDrawer({
  ticket,
  onClose,
  onUpdateTicket,
}) {
  const [selectedStatus, setSelectedStatus] = useState("Open");
  const [handlingNote, setHandlingNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status || "Open");
      setHandlingNote("");
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, "0")} Sep ${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newHistoryItem = {
        action: `Status diubah ke ${selectedStatus}${handlingNote ? `: "${handlingNote}"` : ""}`,
        timestamp: timeStr,
        author: "Admin ERAD",
        type: "update",
      };

      const updatedTicket = {
        ...ticket,
        status: selectedStatus,
        handling: handlingNote || ticket.handling,
        history: [newHistoryItem, ...(ticket.history || [])],
      };

      onUpdateTicket(updatedTicket);
      setSaving(false);
      setHandlingNote("");
    }, 250);
  };

  const statusOptions = ["Open", "Monitor", "Solved", "Closed"];

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
          maxWidth: "520px",
          height: "100%",
          backgroundColor: "#f4f6f8",
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
                <circle cx="12" cy="12" r="10" />
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
              Informasi unit
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

          {/* Card 2: Laporan */}
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
              Laporan
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                  Kerusakan
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-dark)", marginTop: "3px", lineHeight: 1.4 }}>
                  {ticket.description || "-"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                  Penanganan
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-dark)", marginTop: "3px", lineHeight: 1.4 }}>
                  {ticket.handling || "Belum ada penanganan"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                  Penyebab
                </span>
                <p style={{ fontSize: "13px", color: "var(--text-dark)", marginTop: "3px" }}>
                  {ticket.cause || "-"}
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

          {/* Card 3: Riwayat perubahan */}
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
              Riwayat perubahan
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {ticket.history?.map((h, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "var(--primary-teal)",
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dark)" }}>
                      {h.action}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {h.timestamp} · {h.author}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Ubah status / tambah catatan */}
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
              Ubah status / tambah catatan
            </h3>

            {/* Status baru selection */}
            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Status baru
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
                Catatan penanganan (opsional)
              </span>
              <textarea
                rows={3}
                value={handlingNote}
                onChange={(e) => setHandlingNote(e.target.value)}
                placeholder="Contoh: komponen diganti, menunggu observasi 24 jam"
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
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>

              <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                Perubahan tercatat di riwayat & audit log.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
