import { useState, useEffect } from "react";
import api from "../../lib/api.js";

function TelegramModalContent({ onClose, telegramUser, onSuccess }) {
  const isEdit = Boolean(telegramUser);
  const [username, setUsername] = useState(telegramUser?.username || "");
  const [fullName, setFullName] = useState(telegramUser?.fullName || "");
  const [isActive, setIsActive] = useState(telegramUser?.isActive !== false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (telegramUser) {
      setUsername(telegramUser.username || "");
      setFullName(telegramUser.fullName || "");
      setIsActive(telegramUser.isActive !== false);
    } else {
      setUsername("");
      setFullName("");
      setIsActive(true);
    }
  }, [telegramUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.replace(/^@/, "").trim();
    if (!cleanUsername) {
      setError("Username Telegram wajib diisi.");
      return;
    }

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: cleanUsername,
        fullName: fullName.trim(),
        isActive,
      };

      if (isEdit) {
        await api.patch(`/telegram-users/${telegramUser.id}`, payload);
      } else {
        await api.post("/telegram-users", payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan data Telegram user:", err);
      setError(err.response?.data?.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
            {isEdit ? "Edit Pengguna Telegram Whitelist" : "Tambah Pengguna Telegram ke Whitelist"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#94A3B8",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#B91C1C",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Username */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Username Telegram *
              </label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    borderRight: "none",
                    borderTopLeftRadius: "8px",
                    borderBottomLeftRadius: "8px",
                    color: "#64748B",
                    fontSize: "13px",
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username_telegram"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderTopRightRadius: "8px",
                    borderBottomRightRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal, #0d9488)")}
                  onBlur={(e) => (e.target.style.borderColor = "#CBD5E1")}
                />
              </div>
              <span style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px", display: "block" }}>
                Username Telegram tanpa spasi (contoh: budi_teknisi).
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal, #0d9488)")}
                onBlur={(e) => (e.target.style.borderColor = "#CBD5E1")}
              />
            </div>

            {/* Status Whitelist Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <input
                type="checkbox"
                id="isActiveTg"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "var(--primary-teal, #0d9488)",
                }}
              />
              <label htmlFor="isActiveTg" style={{ fontSize: "13px", color: "#334155", fontWeight: 500, cursor: "pointer" }}>
                Aktifkan izin akses bot Telegram (Whitelist)
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#FFFFFF",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8FAFC";
                e.currentTarget.style.borderColor = "#94A3B8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.borderColor = "#CBD5E1";
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--primary-teal, #0d9488)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background-color 0.15s ease",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "var(--primary-teal-hover, #0f766e)";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "var(--primary-teal, #0d9488)";
              }}
            >
              {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambahkan ke Whitelist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TelegramModal({ isOpen, onClose, telegramUser, onSuccess }) {
  if (!isOpen) return null;
  return <TelegramModalContent onClose={onClose} telegramUser={telegramUser} onSuccess={onSuccess} />;
}
