import { useState } from "react";
import Modal from "../common/Modal.jsx";
import api from "../../lib/api.js";
import { createUserSchema, updateUserSchema } from "../../lib/validators.js";

function UserModalContent({ onClose, user, onSuccess }) {
  const isEdit = !!user;

  const [formData, setFormData] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "ADMIN",
    status: user?.status || "ACTIVE",
  }));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isEdit) {
        const parsed = updateUserSchema.safeParse(formData);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          const mapped = {};
          Object.keys(fieldErrors).forEach((key) => {
            mapped[key] = fieldErrors[key][0];
          });
          setErrors(mapped);
          setLoading(false);
          return;
        }

        await api.patch(`/users/${user.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        });

        onSuccess();
        onClose();
      } else {
        const parsed = createUserSchema.safeParse(formData);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          const mapped = {};
          Object.keys(fieldErrors).forEach((key) => {
            mapped[key] = fieldErrors[key][0];
          });
          setErrors(mapped);
          setLoading(false);
          return;
        }

        const res = await api.post("/users", {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        });

        const initialPassword = res.data?.data?.initialPassword;
        setCreatedInfo({
          email: formData.email,
          initialPassword,
        });
        onSuccess();
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.details && Array.isArray(resp.details)) {
        const mapped = {};
        resp.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setErrors(mapped);
      } else {
        setErrors({ general: resp?.message || "Terjadi kesalahan saat menyimpan data." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (createdInfo) {
    return (
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            backgroundColor: "var(--primary-teal-light)",
            color: "var(--primary-teal)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h4 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Pengguna Berhasil Ditambahkan!</h4>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: "16px" }}>
          Kredensial login awal pengguna ini:
        </p>
        <div
          style={{
            backgroundColor: "var(--bg-main)",
            border: "1px solid var(--border-light)",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "var(--text-sm)",
            textAlign: "left",
            marginBottom: "20px",
          }}
        >
          <div style={{ marginBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>Email: </span>
            <strong>{createdInfo.email}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Password Awal: </span>
            <code style={{ backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
              {createdInfo.initialPassword}
            </code>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--primary-teal)",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Selesai
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {errors.general && (
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: "6px",
            fontSize: "var(--text-sm)",
          }}
        >
          {errors.general}
        </div>
      )}

      {/* Nama */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Nama Lengkap
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Contoh: Bruno Admin"
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: `1px solid ${errors.name ? "#ef4444" : "var(--border-light)"}`,
            outline: "none",
            fontSize: "var(--text-sm)",
          }}
          required
        />
        {errors.name && <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errors.name}</span>}
      </div>

      {/* Email */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Contoh: bruno@erad.id"
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: `1px solid ${errors.email ? "#ef4444" : "var(--border-light)"}`,
            outline: "none",
            fontSize: "var(--text-sm)",
          }}
          required
        />
        {errors.email && <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errors.email}</span>}
      </div>

      {/* Peran / Role */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Peran (Role)
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
            backgroundColor: "#ffffff",
            fontSize: "var(--text-sm)",
            outline: "none",
          }}
        >
          <option value="ADMIN">Admin (Akses Penuh)</option>
          <option value="COORDINATOR">Coordinator</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {/* Status (Khusus Edit) */}
      {isEdit && (
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
            Status Akun
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "#ffffff",
              fontSize: "var(--text-sm)",
              outline: "none",
            }}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="SUSPENDED">Suspended (Dinonaktifkan)</option>
            <option value="INVITED">Invited</option>
          </select>
        </div>
      )}

      {/* Tombol Aksi */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
            backgroundColor: "#ffffff",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: "pointer",
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
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Pengguna"}
        </button>
      </div>
    </form>
  );
}

export default function UserModal({ isOpen, onClose, user, onSuccess }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit Pengguna Dashboard" : "Tambah Pengguna Baru"}
      maxWidth="500px"
    >
      {isOpen && (
        <UserModalContent
          key={user?.id || "new-user"}
          user={user}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
