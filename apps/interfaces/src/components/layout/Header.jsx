import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

// Map route path ke judul & subtitle
const PAGE_META = {
  "/": { title: "Ringkasan", subtitle: "Ringkasan dan status keseluruhan sistem aftersales" },
  "/analitik-error": { title: "Analitik Error", subtitle: "Analisis dan statistik error ROS secara rinci" },
  "/daftar-tiket": { title: "Daftar Tiket", subtitle: "Kelola dan pantau tiket aftersales yang masuk" },
  "/master-data": { title: "Master Data", subtitle: "Pengelolaan data referensi dan konfigurasi sistem" },
  "/pengguna-whitelist": { title: "Pengguna & Whitelist", subtitle: "Akun dashboard dan pengguna bot Telegram" },
  "/audit-log": { title: "Audit Log", subtitle: "Rekam jejak aktivitas dan perubahan dalam sistem" },
};

// Modal konfirmasi logout
function LogoutModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(11, 30, 39, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "380px",
          padding: "28px 24px 24px 24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
          Konfirmasi Logout
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 }}>
          Apakah Anda yakin ingin keluar dari sesi ini? Anda perlu login kembali untuk mengakses dashboard.
        </p>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ya, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Ambil judul & subtitle berdasarkan route aktif
  const meta = PAGE_META[location.pathname] || { title: "Dashboard", subtitle: "" };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Ambil langsung dari data user database (via AuthContext)
  const currentUser = user?.user || user;
  const displayName = currentUser?.name || currentUser?.email || "Pengguna";
  const displayRole =
    currentUser?.role === "ADMIN"
      ? "Admin"
      : currentUser?.role === "COORDINATOR"
      ? "Coordinator"
      : currentUser?.role === "VIEWER"
      ? "Viewer"
      : currentUser?.role || "-";

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px 16px 32px",
          backgroundColor: "transparent",
        }}
      >
        {/* Page Title & Subtitle — Dinamis sesuai menu aktif */}
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-dark)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {meta.title}
          </h1>
          {meta.subtitle && (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              {meta.subtitle}
            </p>
          )}
        </div>

        {/* User Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Avatar Inisial */}
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#11222c",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
            >
              {getInitials(displayName)}
            </div>

            {/* Nama & Role */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontWeight: 650,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-dark)",
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "2px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {displayRole}
              </span>
            </div>
          </div>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title="Logout"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Modal Konfirmasi Logout */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
