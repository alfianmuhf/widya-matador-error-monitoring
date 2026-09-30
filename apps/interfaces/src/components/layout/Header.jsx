import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import ChangePasswordModal from "../common/ChangePasswordModal.jsx";

// Map route path ke judul & subtitle
const PAGE_META = {
  "/": { title: "Ringkasan", subtitle: "Ringkasan dan status keseluruhan sistem aftersales" },
  "/analitik-error": { title: "Analitik Error", subtitle: "Distribusi kegagalan per component, failure code, dan unit" },
  "/daftar-tiket": { title: "Daftar Tiket", subtitle: "Telusuri, filter, dan tindak lanjuti tiket error" },
  "/master-data": { title: "Master Data", subtitle: "Pengelolaan data referensi dan konfigurasi sistem" },
  "/pengguna-whitelist": { title: "Pengguna & Whitelist", subtitle: "Akun dashboard dan pengguna bot Telegram" },
  "/audit-log": { title: "Audit Log", subtitle: "Jejak seluruh perubahan data pada sistem" },
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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    if (isAccountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountMenuOpen]);

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

        {/* Right Area: Export Action + User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {(location.pathname === "/" || location.pathname === "/ringkasan" || location.pathname === "/daftar-tiket" || location.pathname === "/analitik-error") && (
            <button
              type="button"
              id="header-export-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("export-laporan-modal"));
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                border: "1px solid var(--border-light)",
                borderRadius: "10px",
                padding: "8px 16px",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                animation: "fadeIn 0.2s ease",
                outline: "none",
                transform: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary-teal)";
                e.currentTarget.style.backgroundColor = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-light)";
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export laporan
            </button>
          )}

          {/* User Profile & Account Menu Dropdown */}
          <div ref={accountMenuRef} style={{ position: "relative" }}>
          <div
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            title="Menu Akun"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "5px 12px 5px 6px",
              borderRadius: "10px",
              cursor: "pointer",
              border: isAccountMenuOpen ? "1px solid var(--primary-teal)" : "1px solid var(--border-light)",
              backgroundColor: isAccountMenuOpen ? "var(--surface-card)" : "#ffffff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              userSelect: "none",
              outline: "none",
              transform: "none",
            }}
            onMouseEnter={(e) => {
              if (!isAccountMenuOpen) e.currentTarget.style.borderColor = "var(--primary-teal)";
            }}
            onMouseLeave={(e) => {
              if (!isAccountMenuOpen) e.currentTarget.style.borderColor = "var(--border-light)";
            }}
          >
            {/* Avatar Inisial */}
            <div
              style={{
                width: "36px",
                height: "36px",
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

            {/* Chevron Icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                marginLeft: "4px",
                color: "var(--text-muted)",
                transform: isAccountMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Account Dropdown Menu */}
          {isAccountMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: "260px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid var(--border-light)",
                boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 8px 12px -6px rgba(0, 0, 0, 0.08)",
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              {/* User Info Header */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
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
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "var(--text-dark)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {displayName}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        fontSize: "0.775rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {currentUser?.email || "-"}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 8px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {displayRole}
                </span>
              </div>

              {/* Menu Actions */}
              <div style={{ padding: "6px" }}>
                {/* Tombol Ubah Password */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setShowChangePasswordModal(true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "var(--text-dark)",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, color 0.15s ease",
                    textAlign: "left",
                    outline: "none",
                    transform: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                    e.currentTarget.style.color = "var(--primary-teal)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-dark)";
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Ubah Password
                </button>

                {/* Divider */}
                <div
                  style={{
                    height: "1px",
                    backgroundColor: "var(--border-light)",
                    margin: "4px 0",
                  }}
                />

                {/* Tombol Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "#dc2626",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    textAlign: "left",
                    outline: "none",
                    transform: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Keluar (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </header>

      {/* Modal Ubah Password */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Modal Konfirmasi Logout */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}

