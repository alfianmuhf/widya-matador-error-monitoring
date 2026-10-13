import { useState, useEffect, useMemo } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function TransferAftersalesModal({ isOpen, onClose, ticket, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";

  const [aftersalesUsers, setAftersalesUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Identify current aftersales responsible user
  const currentAftersalesId = ticket?.aftersalesUserId || ticket?.aftersales_user_id || ticket?.aftersalesUser?.id;
  const currentAftersalesName = ticket?.aftersalesUser?.name || "Petugas Aftersales";
  const currentAftersalesEmail = ticket?.aftersalesUser?.email || "-";

  useEffect(() => {
    if (!isOpen) return;

    setSelectedUserId("");
    setErrorMessage(null);
    setFetchingUsers(true);

    api
      .get("/users?limit=100")
      .then((res) => {
        const rawUsers = res.data?.data?.users || (Array.isArray(res.data?.data) ? res.data?.data : []);
        const aftersalesOnly = rawUsers.filter((u) => {
          const div = (u.division || "").toLowerCase();
          return div === "after_sales";
        });
        setAftersalesUsers(aftersalesOnly);
      })
      .catch((err) => {
        console.error("Gagal memuat pengguna Aftersales:", err);
      })
      .finally(() => {
        setFetchingUsers(false);
      });
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUserId) {
      setErrorMessage("Silakan pilih petugas Aftersales baru yang akan bertanggung jawab.");
      return;
    }

    if (selectedUserId === currentAftersalesId) {
      setErrorMessage("Pengguna yang dipilih sudah menjadi penanggung jawab tiket ini.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch(`/ticket-management/${ticket.id}/aftersales-lead`, {
        aftersalesUserId: selectedUserId,
      });

      const updated = res.data?.data;
      if (onSuccess) {
        onSuccess(updated || { ...ticket, aftersales_user_id: selectedUserId });
      }
      onClose();
    } catch (err) {
      console.error("Gagal mengalihkan penanggung jawab aftersales:", err);
      const msg = err.response?.data?.message || "Gagal mengalihkan penanggung jawab Aftersales.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
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
          maxWidth: "520px",
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
            backgroundColor: "#eff6ff",
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
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              🔄
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 750, color: "#1e3a8a" }}>
                Alih Tanggung Jawab Aftersales
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                  {ticket.id}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>•</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
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
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {errorMessage && (
            <div
              style={{
                padding: "12px 14px",
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
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CURRENT RESPONSIBLE */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Penanggung Jawab Saat Ini
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 750, color: "#0f172a", marginTop: "2px" }}>
                {currentAftersalesName}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {currentAftersalesEmail}
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
              }}
            >
              Open Owner
            </span>
          </div>

          {/* SELECT TARGET AFTERSALES */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Pilih Petugas Aftersales Pengganti
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
              <option value="">-- Pilih Akun Divisi Aftersales --</option>
              {aftersalesUsers.map((u) => {
                const isCurrent = u.id === currentAftersalesId;
                const tgTag = u.telegram_user ? `@${u.telegram_user.username || u.telegram_user.full_name}` : "";
                return (
                  <option key={u.id} value={u.id} disabled={isCurrent}>
                    {u.name} ({u.email}) {tgTag ? `• ${tgTag}` : ""} {isCurrent ? "(Saat Ini)" : ""}
                  </option>
                );
              })}
            </select>
            <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
              Hanya petugas yang dialihkan yang dapat melakukan update pada tiket selama berstatus Open.
            </span>
          </div>

          {/* ACTIONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 650,
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || fetchingUsers || !selectedUserId}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                backgroundColor: selectedUserId ? "#2563eb" : "#94a3b8",
                color: "#ffffff",
                cursor: submitting || fetchingUsers || !selectedUserId ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.25)",
              }}
            >
              {submitting ? "Mengalihkan..." : "Alihkan Tanggung Jawab"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
