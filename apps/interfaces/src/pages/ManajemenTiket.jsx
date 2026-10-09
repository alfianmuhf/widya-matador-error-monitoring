import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import UpdateTicketModal from "../components/tickets/UpdateTicketModal.jsx";
import TicketDetailDrawer from "../components/tickets/TicketDetailDrawer.jsx";
import AddAssigneeModal from "../components/tickets/AddAssigneeModal.jsx";

export default function ManajemenTiket() {
  const { accessToken, user } = useAuth();
  const currentUser = user?.user || user;
  const userDivision = (currentUser?.division || "").toLowerCase();
  const userRole = (currentUser?.role || "").toLowerCase();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaInfo, setMetaInfo] = useState(null);
  const [kpiInfo, setKpiInfo] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all"); // "all" | "rendah" | "sedang" | "tinggi"

  // Modal State
  const [editingTicket, setEditingTicket] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [assigneeTicket, setAssigneeTicket] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
      telegramUserId: a.telegramUserId || a.telegram_user_id,
    };
  }, []);

  // Fetch managed tickets from Dedicated Coordinator Backend API (/ticket-management)
  const fetchManagedTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/ticket-management");
      const list = res.data?.data || [];
      const meta = res.data?.meta || {};
      const kpi = res.data?.kpi || {};

      const formatted = list.map((t) => {
        const backendAssignees = (t.assignees || []).map(normalizeAssignee).filter(Boolean);
        return {
          ...t,
          assignees: backendAssignees,
          assignedMembers: backendAssignees,
        };
      });

      setTickets(formatted);
      setMetaInfo(meta);
      setKpiInfo(kpi);
    } catch (err) {
      console.error("Gagal memuat tiket yang dikelola coordinator:", err);
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

    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const sseUrl = `${baseURL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
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

  const activeDivision = (metaInfo?.division || userDivision).toLowerCase();
  const isAfterSales = activeDivision === "after_sales";
  const isSoftware = activeDivision === "software";

  // Filter Search & Severity
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const sev = (t.rawSeverity || t.severity || "").toLowerCase();

      // Filter Severity
      if (selectedSeverity !== "all" && sev !== selectedSeverity) return false;

      // Filter Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchId = t.id?.toLowerCase().includes(query);
        const matchUnit = t.unit?.toLowerCase().includes(query);
        const matchClient = t.client?.toLowerCase().includes(query);
        const matchComp = t.component?.toLowerCase().includes(query);
        const matchCode = t.failureCode?.toLowerCase().includes(query);
        const matchDesc = (t.damageDescription || t.description || "")?.toLowerCase().includes(query);
        if (!matchId && !matchUnit && !matchClient && !matchComp && !matchCode && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, selectedSeverity, searchTerm]);

  // Helper badge status
  const getStatusBadge = (statusStr) => {
    const s = (statusStr || "").toLowerCase();
    if (s === "open") {
      return {
        label: "Open",
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#2563eb",
        border: "rgba(59, 130, 246, 0.25)",
        dot: "#3b82f6",
      };
    }
    if (s === "escalated") {
      return {
        label: "Escalated",
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#d97706",
        border: "rgba(245, 158, 11, 0.3)",
        dot: "#f59e0b",
      };
    }
    return {
      label: "Solved",
      bg: "rgba(16, 185, 129, 0.12)",
      color: "#059669",
      border: "rgba(16, 185, 129, 0.25)",
      dot: "#10b981",
    };
  };

  // Helper badge severity
  const getSeverityBadge = (sevStr) => {
    const s = (sevStr || "").toLowerCase();
    if (s === "tinggi") {
      return { label: "Tinggi", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    }
    if (s === "sedang") {
      return { label: "Sedang", bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
    }
    return { label: "Rendah", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
  };

  const handleUpdateSuccess = (updated) => {
    showToast(`Tiket ${updated.id} berhasil diperbarui ke Versi ${updated.currentVersion ?? (updated.current_version ?? 0)}!`);
    fetchManagedTickets();
  };

  const handleAssigneeSuccess = (updated) => {
    showToast(`Daftar anggota tim software berhasil diperbarui!`);
    fetchManagedTickets();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 10000,
            backgroundColor: "#0b1e27",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13.5px",
            fontWeight: 600,
            borderLeft: "4px solid #10b981",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span style={{ color: "#34d399", fontSize: "16px" }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BANNER KHUSUS COORDINATOR */}
      <div
        style={{
          backgroundColor: isAfterSales ? "#eff6ff" : "#fffbeb",
          border: isAfterSales ? "1.5px solid #bfdbfe" : "1.5px solid #fde68a",
          borderRadius: "12px",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 750,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: isAfterSales ? "#1d4ed8" : "#b45309",
                backgroundColor: isAfterSales ? "rgba(37, 99, 235, 0.15)" : "rgba(217, 119, 6, 0.15)",
                padding: "3px 8px",
                borderRadius: "5px",
              }}
            >
              Akses Khusus Coordinator {isAfterSales ? "Aftersales" : "Software"}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Login: <b>{metaInfo?.coordinatorName || currentUser?.name}</b> ({currentUser?.email})
            </span>
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: 750, color: "var(--text-dark)", marginTop: "6px" }}>
            {isAfterSales
              ? "📋 Tiket Open dalam Tanggung Jawab Aftersales"
              : "💻 Tiket Escalated yang Ditugaskan ke Tim Software"}
          </h2>
          <p style={{ fontSize: "13px", color: "#475569", marginTop: "3px" }}>
            {isAfterSales
              ? "Menampilkan tiket yang berstatus 'Open' dan dibuat/ditangani oleh Anda (berdasarkan riwayat version 1 / awal)."
              : "Menampilkan tiket yang berstatus 'Escalated' di mana Anda terdaftar aktif dalam daftar ticket_assignees."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 650, textTransform: "uppercase" }}>
              Total Tiket
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-dark)" }}>
              {kpiInfo?.total ?? tickets.length}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: 650, textTransform: "uppercase" }}>
              Severity Tinggi
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626" }}>
              {kpiInfo?.highSeverityCount ?? tickets.filter((t) => (t.rawSeverity || t.severity || "").toLowerCase() === "tinggi").length}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {/* Search Bar */}
        <div style={{ flex: "1 1 320px", position: "relative" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari ID tiket, unit, modul, klien, atau gejala..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              outline: "none",
              backgroundColor: "#f8fafc",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0e8587")}
            onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
          />
        </div>

        {/* Severity Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-muted)" }}>Severity:</span>
          {["all", "tinggi", "sedang", "rendah"].map((sev) => {
            const isSelected = selectedSeverity === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 650,
                  textTransform: "capitalize",
                  cursor: "pointer",
                  border: isSelected ? "1px solid #0e8587" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#e8f7f6" : "#ffffff",
                  color: isSelected ? "#0e8587" : "#64748b",
                }}
              >
                {sev === "all" ? "Semua" : sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLE DAFTAR TIKET */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "14px" }}>
            <div style={{ marginBottom: "8px" }}>⏳</div>
            Memuat daftar tiket manajemen coordinator...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>✨</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-dark)" }}>
              Tidak ada tiket yang perlu dikelola saat ini
            </div>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>
              {isAfterSales
                ? "Tidak ada tiket berstatus 'Open' yang tercatat dibuat oleh Anda."
                : "Tidak ada tiket berstatus 'Escalated' yang menugaskan Anda dalam tim software."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #edf2f7" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>ID Tiket & Versi</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Unit & Lokasi</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Modul & Kode</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Status & Severity</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Gejala & Tindakan Terakhir</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => {
                  const statusBadge = getStatusBadge(t.rawStatus || t.status);
                  const severityBadge = getSeverityBadge(t.rawSeverity || t.severity);

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: "1px solid #edf2f7",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* ID Tiket & Versi */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 750, color: "#0f172a", fontFamily: "monospace", fontSize: "13.5px" }}>
                            {t.id}
                          </span>
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "9999px",
                              backgroundColor: "#e2e8f0",
                              color: "#334155",
                            }}
                          >
                            v{t.currentVersion ?? t.current_version ?? 0}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "6px" }}>
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString("id-ID") : "-"}
                          </span>
                        </div>
                        {t.assignees && t.assignees.length > 0 && (
                          <div style={{ marginTop: "5px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#e8f7f6",
                                color: "#0e8587",
                                border: "1px solid #ccfbf1",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              👥 {t.assignees.length} Software {t.assignees.some((a) => a.isLeader) ? "👑" : ""}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Unit & Lokasi */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-dark)", fontFamily: "monospace" }}>
                          {t.unit}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {t.client || "-"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                          📍 {t.location || "-"}
                        </div>
                      </td>

                      {/* Komponen & Failure Code */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 650, color: "var(--text-dark)" }}>
                          {t.component}
                        </div>
                        <div style={{ marginTop: "3px" }}>
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

                      {/* Status & Severity */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.border}`,
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: statusBadge.dot }} />
                            {statusBadge.label}
                          </span>

                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 650,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: severityBadge.bg,
                              color: severityBadge.color,
                              border: `1px solid ${severityBadge.border}`,
                            }}
                          >
                            sev: {severityBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* Gejala & Tindakan Terakhir */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: "300px" }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "var(--text-dark)",
                            lineHeight: 1.4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={t.damageDescription || t.description || "-"}
                        >
                          <b>Gejala:</b> {t.damageDescription || t.description || "-"}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            color: "#059669",
                            marginTop: "4px",
                            lineHeight: 1.4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={t.actionTaken || t.handling || "-"}
                        >
                          <b>Tindakan:</b> {t.actionTaken || t.handling || "Belum ada tindakan dicatat"}
                        </div>
                      </td>

                      {/* Tombol Aksi */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          {/* Tombol Tambah Anggota (Khusus Tiket Escalated / Tim Software) */}
                          {((t.rawStatus || t.status || "").toLowerCase() === "escalated" || isSoftware) && (
                            <button
                              type="button"
                              onClick={() => setAssigneeTicket(t)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "7px",
                                fontSize: "12px",
                                fontWeight: 700,
                                border: "1px solid #0e8587",
                                backgroundColor: "#e8f7f6",
                                color: "#0e8587",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                boxShadow: "0 1px 2px rgba(14, 133, 135, 0.1)",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#0e8587";
                                e.currentTarget.style.color = "#ffffff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#e8f7f6";
                                e.currentTarget.style.color = "#0e8587";
                              }}
                              title="Tambah / Kelola anggota tim Software untuk tiket ini"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                              + Anggota
                            </button>
                          )}

                          {/* Tombol Update Tiket */}
                          <button
                            type="button"
                            onClick={() => setEditingTicket(t)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "7px",
                              fontSize: "12.5px",
                              fontWeight: 700,
                              border: "none",
                              backgroundColor: "#0e8587",
                              color: "#ffffff",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              boxShadow: "0 1px 2px rgba(14, 133, 135, 0.2)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0b7173")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0e8587")}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Update
                          </button>

                          {/* Tombol Detail & Riwayat */}
                          <button
                            type="button"
                            onClick={() => setDetailTicket(t)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "7px",
                              fontSize: "12px",
                              fontWeight: 650,
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                            title="Lihat detail dan riwayat linimasa tiket"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Riwayat
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL UPDATE TIKET */}
      {editingTicket && (
        <UpdateTicketModal
          isOpen={Boolean(editingTicket)}
          onClose={() => setEditingTicket(null)}
          ticket={editingTicket}
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

      {/* MODAL TAMBAH ANGGOTA TIM SOFTWARE */}
      {assigneeTicket && (
        <AddAssigneeModal
          isOpen={Boolean(assigneeTicket)}
          onClose={() => setAssigneeTicket(null)}
          ticket={assigneeTicket}
          onSuccess={handleAssigneeSuccess}
        />
      )}
    </div>
  );
}
