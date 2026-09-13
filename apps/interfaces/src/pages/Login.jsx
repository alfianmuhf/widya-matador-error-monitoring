import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { loginSchema } from "../lib/validators.js";

const page = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  padding: 24,
};

const card = {
  width: "100%",
  maxWidth: 400,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "28px 24px",
};

const label = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--heading)",
  marginBottom: 6,
};

const input = (hasError) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${hasError ? "#dc2626" : "var(--border)"}`,
  fontSize: "var(--text-base)",
  lineHeight: 1.4,
  color: "var(--heading)",
  background: "var(--surface)",
  outline: "none",
});

const btn = (loading) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--heading)",
  background: loading ? "var(--muted)" : "var(--heading)",
  color: "#fff",
  fontSize: "var(--text-base)",
  fontWeight: 600,
  cursor: loading ? "not-allowed" : "pointer",
});

const helper = {
  margin: "8px 0 20px",
  fontSize: "var(--text-sm)",
  color: "var(--muted)",
  lineHeight: 1.5,
};

const err = { fontSize: "var(--text-xs)", color: "#dc2626", marginTop: 6, lineHeight: 1.4 };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          details.forEach((detail) => { if (detail.field) mappedErrors[detail.field] = detail.message; });
          setErrors(mappedErrors);
        } else setErrors({ form: "Validasi gagal, periksa kembali input." });
      } else if (status === 401) setErrors({ form: "Email atau password salah" });
      else setErrors({ form: "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: 6 }}>Widya Matador • Login</h1>
        <p style={helper}>Masuk untuk melanjutkan</p>
        {errors.form && <p style={{ ...err, fontSize: "var(--text-sm)", textAlign: "center", marginBottom: 12 }}>{errors.form}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email" style={label}>Email</label>
            <input id="email" type="email" value={email} autoComplete="email" placeholder="nama@email.com" onChange={(e) => setEmail(e.target.value)} style={input(!!errors.email)} />
            {errors.email && <p style={err}>{errors.email}</p>}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="password" style={label}>Password</label>
            <input id="password" type="password" value={password} autoComplete="current-password" placeholder="••••••" onChange={(e) => setPassword(e.target.value)} style={input(!!errors.password)} />
            {errors.password && <p style={err}>{errors.password}</p>}
          </div>
          <button type="submit" disabled={loading} style={btn(loading)}>{loading ? "Memuat..." : "Masuk"}</button>
        </form>
        <p style={{ marginTop: 16, fontSize: "var(--text-xs)", color: "var(--muted)", textAlign: "center" }}>Lupa password? Hubungi administrator.</p>
      </div>
    </div>
  );
}
