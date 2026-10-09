import { useState } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ForcedChangePasswordModal({ user }) {
  const { updateAuthSession, logout } = useAuth();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.currentPassword) {
      newErrors.currentPassword = "Password saat ini wajib diisi";
    }
    if (!formData.newPassword) {
      newErrors.newPassword = "Password baru wajib diisi";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Password baru minimal 6 karakter";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password baru wajib diisi";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password baru tidak cocok";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      const responseData = res.data;
      setSuccessMessage(
        responseData.message || "Password berhasil diubah! Status akun Anda kini aktif."
      );

      // Perbarui sesi aktif di AuthContext
      if (updateAuthSession && responseData.data?.accessToken) {
        setTimeout(() => {
          updateAuthSession(responseData.data.accessToken, responseData.data.user);
        }, 1200);
      }
    } catch (err) {
      console.error("Gagal mengubah password awal:", err);
      const resData = err.response?.data;
      if (resData?.details && Array.isArray(resData.details)) {
        const mapped = {};
        resData.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setErrors(mapped);
      } else {
        setGeneralError(
          resData?.message || "Terjadi kesalahan saat mengubah password. Silakan periksa kembali data Anda."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          padding: "32px",
          position: "relative",
          animation: "modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 4px 6px -1px rgba(217, 119, 6, 0.15)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>
            Aktivasi Akun & Ubah Password
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            Halo, <strong style={{ color: "#0f172a" }}>{user?.name || user?.email}</strong>! Akun Anda baru saja dibuat
            dengan status <strong style={{ color: "#d97706" }}>invited</strong>. Demi keamanan, Anda diwajibkan mengubah
            password awal sebelum dapat mengakses dashboard.
          </p>
        </div>

        {/* Alert Sukses */}
        {successMessage && (
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              color: "#16a34a",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <strong>Aktivasi Berhasil!</strong>
              <div>{successMessage}</div>
            </div>
          </div>
        )}

        {/* Alert Error */}
        {generalError && (
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {/* Form Ubah Password */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Field: Password Saat Ini */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Password Saat Ini (Password Awal) <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Masukkan password saat login"
                disabled={loading || !!successMessage}
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "8px",
                  border: errors.currentPassword ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#1e293b",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showCurrent ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <span style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                {errors.currentPassword}
              </span>
            )}
          </div>

          {/* Field: Password Baru */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Password Baru <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Minimal 6 karakter"
                disabled={loading || !!successMessage}
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "8px",
                  border: errors.newPassword ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#1e293b",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showNew ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.newPassword && (
              <span style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                {errors.newPassword}
              </span>
            )}
          </div>

          {/* Field: Konfirmasi Password Baru */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Konfirmasi Password Baru <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ulangi password baru Anda"
                disabled={loading || !!successMessage}
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "8px",
                  border: errors.confirmPassword ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                  fontSize: "0.875rem",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#1e293b",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!successMessage}
            style={{
              marginTop: "8px",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--primary-teal, #0d9488)",
              color: "#ffffff",
              fontSize: "0.95rem",
              fontWeight: 650,
              cursor: loading || !!successMessage ? "not-allowed" : "pointer",
              opacity: loading || !!successMessage ? 0.75 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 6px -1px rgba(13, 148, 136, 0.2)",
              transition: "background-color 0.15s ease",
            }}
          >
            {loading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Menyimpan & Mengaktifkan...</span>
              </>
            ) : successMessage ? (
              "Akun Berhasil Diaktifkan!"
            ) : (
              "Simpan Password & Aktifkan Akun"
            )}
          </button>
        </form>

        {/* Escape hatch: Logout option */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            type="button"
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: "0.825rem",
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px 8px",
            }}
          >
            Keluar dari Akun (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
