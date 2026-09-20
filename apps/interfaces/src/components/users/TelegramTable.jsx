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
            <input
              type="text"
              placeholder="Cari ID, username, nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                width: "240px",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "14px",
                color: "#94A3B8",
              }}
            >
              🔍
            </span>
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
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {/* Add Button */}
        {canManageUsers && (
          <button
            type="button"
            onClick={onAddTelegramUser}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              outline: "none",
              transform: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D4ED8")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
          >
            <span>➕</span>
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
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Didafkarkan Oleh</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Tanggal Daftar</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "#94A3B8" }}>
                  Memuat data whitelist Telegram...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "#94A3B8" }}>
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
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontSize: "12px" }}>
                    {user.whitelistedBy?.name || user.whitelistedBy?.email || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontSize: "12px" }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {canManageUsers ? (
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => onEditTelegramUser(user)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid #CBD5E1",
                            backgroundColor: "#FFFFFF",
                            color: "#334155",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: 500,
                            outline: "none",
                            transform: "none",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTelegramUser(user)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid #FCA5A5",
                            backgroundColor: "#FEF2F2",
                            color: "#DC2626",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: 500,
                            outline: "none",
                            transform: "none",
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
