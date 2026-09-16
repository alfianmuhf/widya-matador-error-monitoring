import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { loginSchema } from "../lib/validators.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const f = result.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (error) {
      const status = error.response?.status;
      if (status === 422) {
        const details = error.response?.data?.details;
        if (Array.isArray(details)) {
          const mappedErrors = {};
          details.forEach((detail) => {
            if (detail.field) mappedErrors[detail.field] = detail.message;
          });
          setErrors(mappedErrors);
        } else {
          setErrors({ form: "Validasi gagal, periksa kembali format data yang dimasukkan." });
        }
      } else if (status === 401) {
        setErrors({ form: "Email atau kata sandi tidak sesuai. Silakan coba lagi." });
      } else {
        setErrors({ form: error.response?.data?.message || "Terjadi kendala koneksi ke server. Coba beberapa saat lagi." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        padding: "24px 16px",
        fontFamily: "var(--sans)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              boxShadow: "0 6px 18px rgba(14, 133, 135, 0.28)",
              marginBottom: "14px",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            ERAD Portal
          </h1>
          <p
            style={{
              color: "var(--primary-teal)",
              fontSize: "0.75rem",
              fontWeight: 650,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            Load Scanner Aftersales System
          </p>
        </div>

        {/* Clean White Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "36px 32px 32px 32px",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.03)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              Masuk ke Akun
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                lineHeight: 1.4,
              }}
            >
              Gunakan email dan kata sandi yang telah terdaftar di sistem.
            </p>
          </div>

          {/* Form Error Alert */}
          {errors.form && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "20px",
                color: "#b91c1c",
                fontSize: "0.85rem",
                lineHeight: 1.4,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ flexShrink: 0, marginTop: "1px" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "8px",
                }}
              >
                Email
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    color: errors.email ? "#ef4444" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="admin@widya.com"
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 42px",
                    borderRadius: "10px",
                    border: `1px solid ${errors.email ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "0.9rem",
                    color: "#0f172a",
                    backgroundColor: "#ffffff",
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.email ? "#ef4444" : "var(--primary-teal)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(14, 133, 135, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email ? "#ef4444" : "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
              {errors.email && (
                <p style={{ fontSize: "0.775rem", color: "#dc2626", marginTop: "6px" }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "24px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "8px",
                }}
              >
                Kata Sandi
              </label>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    color: errors.password ? "#ef4444" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 44px 11px 42px",
                    borderRadius: "10px",
                    border: `1px solid ${errors.password ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "0.9rem",
                    color: "#0f172a",
                    backgroundColor: "#ffffff",
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.password ? "#ef4444" : "var(--primary-teal)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(14, 133, 135, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.password ? "#ef4444" : "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />

                {/* Show/Hide Password Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#334155")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: "0.775rem", color: "#dc2626", marginTop: "6px" }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: loading ? "#0a5658" : "var(--primary-teal)",
                color: "#ffffff",
                fontSize: "0.925rem",
                fontWeight: 650,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(14, 133, 135, 0.25)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "var(--primary-teal-hover)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(14, 133, 135, 0.35)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "var(--primary-teal)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 133, 135, 0.25)";
                }
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
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Dashboard
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #f1f5f9",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Lupa kata sandi atau butuh akses akun baru?{" "}
              <span style={{ color: "var(--primary-teal)", fontWeight: 600 }}>
                Hubungi administrator
              </span>
            </p>
          </div>
        </div>

        {/* Global Footer info */}
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                display: "inline-block",
              }}
            />
            <span>Sistem Error Monitoring & Aftersales • PT Widya Matador</span>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
