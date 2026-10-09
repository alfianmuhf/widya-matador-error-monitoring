import { useState, useMemo } from "react";

export default function TelegramTable({
  telegramUsers = [],
  loading = false,
  canManageUsers = true,
  onAddTelegramUser,
  onEditTelegramUser,
  onDeleteTelegramUser,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all" | "active" | "inactive"

  const filteredUsers = useMemo(() => {
    return telegramUsers.filter((user) => {
      const matchSearch =
        (user.telegramId && user.telegramId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchActive = true;
      if (filterActive === "active") matchActive = user.isActive === true;
      if (filterActive === "inactive") matchActive = user.isActive === false;

      return matchSearch && matchActive;
    });
  }, [telegramUsers, searchTerm, filterActive]);

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #FFFFFF)",
        borderRadius: "12px",
        border: "1px solid var(--card-border, #E2E8F0)",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header Toolbar */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--card-border, #E2E8F0)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted, #94A3B8)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari ID, username, nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border-light, #CBD5E1)",
                fontSize: "13px",
                width: "240px",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal, #0d9488)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-light, #CBD5E1)")}
            />
          </div>

          {/* Filter Status */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              backgroundColor: "#FFFFFF",
              outline: "none",
            }}
          >
            <option value="all">Semua Status</option>
            <option value="active">active</option>
            <option value="inactive">non active</option>
          </select>
        </div>

        {/* Add Button */}
        {canManageUsers && (
          <button
            type="button"
            onClick={onAddTelegramUser}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "var(--text-sm, 13px)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              outline: "none",
              transform: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Tambah User Telegram</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Telegram ID</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Username</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Nama Lengkap</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status Whitelist</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Tanggal Daftar</th>
              {canManageUsers && (
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#1E293B", textAlign: "right" }}>Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManageUsers ? 6 : 5} style={{ textAlign: "center", padding: "40px 16px", color: "#94A3B8" }}>
                  Memuat data whitelist Telegram...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={canManageUsers ? 6 : 5} style={{ textAlign: "center", padding: "40px 16px", color: "#94A3B8" }}>
                  Tidak ada pengguna Telegram yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: "1px solid #F1F5F9", transition: "background-color 0.15s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "#1E293B" }}>
                    {user.telegramId}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {user.username ? (
                      <span style={{ color: "#0284C7", fontWeight: 500 }}>@{user.username}</span>
                    ) : (
                      <span style={{ color: "#94A3B8" }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#1E293B", fontWeight: 500 }}>
                    {user.fullName || "-"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: user.isActive ? "#DCFCE7" : "#FEE2E2",
                        color: user.isActive ? "#15803D" : "#B91C1C",
                      }}
                    >
                      {user.isActive ? "active" : "non active"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontSize: "12px" }}>
                    {formatDate(user.createdAt)}
                  </td>
                  {canManageUsers && (
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => onEditTelegramUser(user)}
                          title="Edit User Telegram"
                          style={{
                            background: "none",
                            border: "1px solid var(--border-light, #CBD5E1)",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted, #64748B)",
                            transition: "border-color 0.15s ease, color 0.15s ease",
                            outline: "none",
                            transform: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--primary-teal, #0d9488)";
                            e.currentTarget.style.borderColor = "var(--primary-teal, #0d9488)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-muted, #64748B)";
                            e.currentTarget.style.borderColor = "var(--border-light, #CBD5E1)";
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTelegramUser(user)}
                          title="Hapus User Telegram"
                          style={{
                            background: "none",
                            border: "1px solid var(--border-light, #CBD5E1)",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ef4444",
                            transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease",
                            outline: "none",
                            transform: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#fef2f2";
                            e.currentTarget.style.borderColor = "#f87171";
                            e.currentTarget.style.color = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderColor = "var(--border-light, #CBD5E1)";
                            e.currentTarget.style.color = "#ef4444";
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
