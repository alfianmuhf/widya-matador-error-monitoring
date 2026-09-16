import { useState } from "react";
import Modal from "../common/Modal.jsx";
import api from "../../lib/api.js";
import { createTelegramUserSchema, updateTelegramUserSchema } from "../../lib/validators.js";

function TelegramModalContent({ onClose, telegramUser, onSuccess }) {
  const isEdit = !!telegramUser;

  const [formData, setFormData] = useState(() => ({
    telegramId: telegramUser?.telegramId || "",
    fullName: telegramUser?.fullName || "",
    username: telegramUser?.username ? `@${telegramUser.username.replace(/^@/, "")}` : "",
    isActive: telegramUser?.isActive !== undefined ? telegramUser.isActive : true,
  }));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const cleanUsername = formData.username ? formData.username.replace(/^@/, "").trim() : "";

      if (isEdit) {
        const payload = {
          fullName: formData.fullName.trim() || undefined,
          username: cleanUsername || undefined,
          isActive: formData.isActive,
        };

        const parsed = updateTelegramUserSchema.safeParse(payload);
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

        await api.patch(`/telegram-users/${telegramUser.id}`, payload);
      } else {
        const payload = {
          telegramId: formData.telegramId.trim(),
          fullName: formData.fullName.trim() || undefined,
          username: cleanUsername || undefined,
          isActive: formData.isActive,
        };

        const parsed = createTelegramUserSchema.safeParse(payload);
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

        await api.post("/telegram-users", payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.details && Array.isArray(resp.details)) {
        const mapped = {};
        resp.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setErrors(mapped);
      } else {
        setErrors({ general: resp?.message || "Gagal menyimpan data Telegram Whitelist." });
      }
    } finally {
      setLoading(false);
    }
  };

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

      {/* Telegram ID */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Telegram ID (Numerik)
        </label>
        <input
          type="text"
          name="telegramId"
          value={formData.telegramId}
          onChange={handleChange}
          placeholder="Contoh: 68010000"
          disabled={isEdit}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: `1px solid ${errors.telegramId ? "#ef4444" : "var(--border-light)"}`,
            outline: "none",
            fontSize: "var(--text-sm)",
            backgroundColor: isEdit ? "var(--bg-main)" : "#ffffff",
          }}
          required
        />
        {errors.telegramId && (
          <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
            {errors.telegramId}
          </span>
        )}
        {!isEdit && (
          <small style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px", display: "block" }}>
            User dapat mengetahui ID-nya dengan mengirim perintah /id ke bot @userinfobot di Telegram.
          </small>
        )}
      </div>

      {/* Nama Lengkap */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Nama Lengkap
        </label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Contoh: Darza Wijaya"
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: `1px solid ${errors.fullName ? "#ef4444" : "var(--border-light)"}`,
            outline: "none",
            fontSize: "var(--text-sm)",
          }}
        />
        {errors.fullName && (
          <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
            {errors.fullName}
          </span>
        )}
      </div>

      {/* Username Telegram */}
      <div>
        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
          Username Telegram (@username)
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Contoh: @darza"
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
            outline: "none",
            fontSize: "var(--text-sm)",
          }}
        />
      </div>

      {/* Status Aktif Switch/Checkbox */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary-teal)" }}
        />
        <label htmlFor="isActive" style={{ fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>
          Status Aktif (Dapat membuat tiket via bot Telegram)
        </label>
      </div>

      {/* Tombol Aksi */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
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
          {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan ke Whitelist"}
        </button>
      </div>
    </form>
  );
}

export default function TelegramModal({ isOpen, onClose, telegramUser, onSuccess }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={telegramUser ? "Edit User Telegram Whitelist" : "Tambah Pengguna Bot Telegram"}
      maxWidth="480px"
    >
      {isOpen && (
        <TelegramModalContent
          key={telegramUser?.id || "new-telegram"}
          telegramUser={telegramUser}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
