import { useState } from "react";
import Modal from "./Modal.jsx";
import api from "../../lib/api.js";
import { changePasswordSchema } from "../../lib/validators.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { updateAuthSession } = useAuth();

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

  const handleReset = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
    setGeneralError(null);
    setSuccessMessage(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (loading) return;
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    // Client-side Zod validation
    const parsed = changePasswordSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const mapped = {};
      Object.keys(fieldErrors).forEach((key) => {
        mapped[key] = fieldErrors[key][0];
      });
      setErrors(mapped);
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      const responseData = res.data;
      setSuccessMessage(responseData.message || "Password berhasil diubah!");

      // Update active token & user in AuthContext if provided
      if (updateAuthSession && responseData.data?.accessToken) {
        updateAuthSession(responseData.data.accessToken, responseData.data.user);
      }

      // Automatically close after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Gagal mengubah password:", err);
      const resData = err.response?.data;
      if (resData?.details && Array.isArray(resData.details)) {
        const mapped = {};
        resData.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setErrors(mapped);
      } else {
        setGeneralError(resData?.message || "Terjadi kesalahan saat mengubah password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ubah Password Akun" maxWidth="440px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Success Alert */}
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
              gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* General Error Alert */}
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
              gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {/* Field: Password Saat Ini */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-dark)",
              marginBottom: "6px",
            }}
          >
            Password Saat Ini <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showCurrent ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Masukkan password saat ini"
              disabled={loading}
              style={{
                width: "100%",
                padding: "9px 40px 9px 12px",
                borderRadius: "8px",
                border: errors.currentPassword ? "1px solid #dc2626" : "1px solid var(--border-light)",
                fontSize: "var(--text-sm)",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-dark)",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                if (!errors.currentPassword) e.target.style.borderColor = "var(--primary-teal)";
              }}
              onBlur={(e) => {
                if (!errors.currentPassword) e.target.style.borderColor = "var(--border-light)";
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
                color: "var(--text-muted)",
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
              color: "var(--text-dark)",
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
              disabled={loading}
              style={{
                width: "100%",
                padding: "9px 40px 9px 12px",
                borderRadius: "8px",
                border: errors.newPassword ? "1px solid #dc2626" : "1px solid var(--border-light)",
                fontSize: "var(--text-sm)",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-dark)",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                if (!errors.newPassword) e.target.style.borderColor = "var(--primary-teal)";
              }}
              onBlur={(e) => {
                if (!errors.newPassword) e.target.style.borderColor = "var(--border-light)";
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
                color: "var(--text-muted)",
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
              color: "var(--text-dark)",
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
              placeholder="Ulangi password baru"
              disabled={loading}
              style={{
                width: "100%",
                padding: "9px 40px 9px 12px",
                borderRadius: "8px",
                border: errors.confirmPassword ? "1px solid #dc2626" : "1px solid var(--border-light)",
                fontSize: "var(--text-sm)",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-dark)",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                if (!errors.confirmPassword) e.target.style.borderColor = "var(--primary-teal)";
              }}
              onBlur={(e) => {
                if (!errors.confirmPassword) e.target.style.borderColor = "var(--border-light)";
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
                color: "var(--text-muted)",
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

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
            }}
          >
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
