import { useState, useEffect } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function UpdateTicketModal({ isOpen, onClose, ticket, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userDivision = (currentUser?.division || "").toLowerCase();
  const userRole = (currentUser?.role || "").toLowerCase();

  const [status, setStatus] = useState("open");
  const [severity, setSeverity] = useState("sedang");
  const [damageDescription, setDamageDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (ticket && isOpen) {
      const currentStatus = (ticket.rawStatus || ticket.status || "open").toLowerCase();
      const currentSeverity = (ticket.rawSeverity || ticket.severity || "sedang").toLowerCase();

      setStatus(currentStatus);
      setSeverity(currentSeverity);
      setDamageDescription(ticket.damageDescription || ticket.description || "");
      setActionTaken(ticket.actionTaken || ticket.handling || "");
      setRootCause(ticket.rootCause || ticket.cause || "");
      setNotes("");
      setErrorMessage(null);
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const currentVersion = ticket.currentVersion ?? ticket.current_version ?? 0;
  const nextVersion = currentVersion + 1;
  const currentStatusLower = (ticket.rawStatus || ticket.status || "open").toLowerCase();

  // Status options berdasarkan alur bisnis:
  // - Jika saat ini open: Aftersales bisa tetap open, eskalasi ke software, atau solved langsung oleh aftersales
  // - Jika saat ini escalated: Software bisa tetap escalated (update progres) atau solved
  const statusOptions = [];
  if (currentStatusLower === "open") {
    statusOptions.push({
      value: "open",
      label: "Open (Penanganan Aftersales)",
      desc: "Perbarui catatan tindakan atau kondisi di lapangan",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
    });
    statusOptions.push({
      value: "escalated",
      label: "Eskalasi ke RnD",
      desc: "Alihkan penanganan ke tim RnD untuk investigasi bug/sistem",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    });
    statusOptions.push({
      value: "solved",
      label: "Selesai / Solved (Aftersales)",
      desc: "Masalah operasional/perangkat berhasil diselesaikan oleh Aftersales",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    });
  } else if (currentStatusLower === "escalated") {
    statusOptions.push({
      value: "escalated",
      label: "Tetap Escalated (Progress RnD)",
      desc: "Perbarui progres investigasi, debugging, atau modul patch RnD",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    });
    statusOptions.push({
      value: "solved",
      label: "Selesai / Solved (RnD)",
      desc: "Perbaikan bug/patch RnD berhasil diselesaikan dan terverifikasi",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    });
  } else {
    // Jika tiket status lainnya
    statusOptions.push({
      value: "open",
      label: "Open",
      desc: "Buka kembali tiket",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
    });
    statusOptions.push({
      value: "escalated",
      label: "Escalated",
      desc: "Alihkan ke tim RnD",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    });
    statusOptions.push({
      value: "solved",
      label: "Solved",
      desc: "Tandai tiket selesai",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!actionTaken.trim()) {
      setErrorMessage("Tindakan penanganan (Action Taken) wajib diisi untuk transparansi riwayat penanganan.");
      return;
    }

    if (status === "solved" && !rootCause.trim()) {
      setErrorMessage("Untuk menandai tiket sebagai Solved, silakan isi Akar Masalah (Root Cause) yang ditemukan.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        status: status,
        severity: severity,
        damageDescription: damageDescription.trim() || undefined,
        actionTaken: actionTaken.trim(),
        rootCause: rootCause.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await api.patch(`/tickets/${ticket.id}`, payload);
      const updatedTicket = res.data?.data;

      if (onSuccess) {
        onSuccess(updatedTicket || { ...ticket, ...payload, currentVersion: nextVersion });
      }
      onClose();
    } catch (err) {
      console.error("Gagal memperbarui tiket:", err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.details?.[0]?.message ||
        "Gagal menyimpan pembaruan tiket. Pastikan Anda memiliki hak akses.";
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(11, 30, 39, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            backgroundColor: "#0b1e27",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.14)",
                  padding: "3px 8px",
                  borderRadius: "5px",
                }}
              >
                Pembaruan Tiket
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  padding: "3px 9px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                Versi {currentVersion} ➔ <b style={{ color: "#34d399" }}>Versi {nextVersion}</b>
              </span>
            </div>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: 750,
                color: "#ffffff",
                marginTop: "6px",
                fontFamily: "monospace",
                letterSpacing: "-0.01em",
              }}
            >
              {ticket.id}
            </h3>
            <div style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "2px" }}>
              {ticket.unit} ({ticket.client || "-"}) • Modul {ticket.component} ({ticket.failureCode})
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "12px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "2px" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. STATUS SELECTION */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "8px" }}>
              Pilih Status Tiket Berikutnya <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              {statusOptions.map((opt) => {
                const isSelected = status === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: isSelected ? `2px solid ${opt.color}` : "1.5px solid #e2e8f0",
                      backgroundColor: isSelected ? opt.bg : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? opt.color : "#1e293b" }}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: opt.color }} />
                      )}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {opt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SEVERITY LEVEL */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "8px" }}>
              Tingkat Keparahan (Severity)
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              {[
                { val: "rendah", label: "Rendah", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                { val: "sedang", label: "Sedang", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                { val: "tinggi", label: "Tinggi", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
              ].map((s) => {
                const isSelected = severity === s.val;
                return (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setSeverity(s.val)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 650,
                      cursor: "pointer",
                      border: isSelected ? `2px solid ${s.color}` : "1px solid #e2e8f0",
                      backgroundColor: isSelected ? s.bg : "#f8fafc",
                      color: isSelected ? s.color : "#64748b",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TINDAKAN PENANGANAN (ACTION TAKEN) - WAJIB */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-dark)" }}>
                Tindakan Penanganan (Action Taken) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                Wajib diisi untuk transparansi
              </span>
            </div>
            <textarea
              rows={3}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Contoh: Pembersihan filter polarisasi lensa, penggantian modul konektor M12, pengujian ulang 50 pemindaian..."
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13.5px",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0e8587")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          {/* 4. AKAR MASALAH (ROOT CAUSE) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-dark)" }}>
                Akar Masalah (Root Cause)
                {status === "solved" && <span style={{ color: "#ef4444" }}> *</span>}
              </label>
              {status === "solved" && (
                <span style={{ fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                  Wajib untuk status Solved
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Contoh: Degradasi kapasitor DC-DC step-down karena panas berlebih, konektor tipe clip plastik longgar karena vibrasi lintasan truk..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: status === "solved" && !rootCause.trim() ? "1.5px solid #f87171" : "1.5px solid #cbd5e1",
                fontSize: "13.5px",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0e8587")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          {/* 5. DESKRIPSI KERUSAKAN TERBARU (OPSIONAL REVISI) */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "6px" }}>
              Deskripsi / Gejala Kerusakan (Opsional Pembaruan)
            </label>
            <textarea
              rows={2}
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              placeholder="Perbarui deskripsi kerusakan jika ada gejala baru yang teridentifikasi..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13.5px",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0e8587")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          {/* 6. CATATAN RIWAYAT (NOTES) */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", marginBottom: "6px" }}>
              Catatan Ringkas Riwayat (Log Versi {nextVersion})
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Penggantian sparepart regulator dan kalibrasi output tegangan 24.0V stabil."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13.5px",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0e8587")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>

          {/* MODAL FOOTER */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #edf2f7",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                border: "none",
                backgroundColor: "#0e8587",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(14, 133, 135, 0.25)",
              }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Simpan Pembaruan (v{nextVersion})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
