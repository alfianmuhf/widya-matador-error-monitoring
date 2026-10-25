import InfoBanner from "../common/InfoBanner.jsx";

export default function UserTable({
  users = [],
  loading = false,
  canManageUsers = true,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface-card)",
        borderRadius: "14px",
        border: "1px solid var(--border-light)",
        padding: "24px 28px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-dark)" }}>
          Pengguna Dashboard
        </h2>
        {canManageUsers && (
          <button
            type="button"
            onClick={onAddUser}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 16px",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
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
            Tambah pengguna
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: canManageUsers ? "20%" : "22%" }}>
                Nama
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: canManageUsers ? "20%" : "22%" }}>
                Username
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: canManageUsers ? "16%" : "18%" }}>
                Telegram
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: canManageUsers ? "13%" : "14%" }}>
                Peran
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: canManageUsers ? "13%" : "14%" }}>
                Divisi
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "10%" }}>
                Status
              </th>
              {canManageUsers && (
                <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)", width: "8%", textAlign: "right" }}>
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManageUsers ? 7 : 6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Memuat data pengguna...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={canManageUsers ? 7 : 6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Belum ada data pengguna dashboard.
                </td>
              </tr>
            ) : (
              users.map((item) => {
                const role = (item.role || "").toLowerCase();
                const roleLabel = role || "-";

                const div = (item.division || "").toLowerCase();
                const divisionLabel =
                  div === "after_sales"
                    ? "After Sales"
                    : div === "rnd" || div === "software"
                    ? "RnD"
                    : "-";

                const status = (item.status || "").toLowerCase();
                const isActive = status === "active";
                const isInvited = status === "invited";
                const statusLabel = status || "-";

                const dotColor = isActive
                  ? "var(--status-active-dot)"
                  : isInvited
                  ? "#f59e0b"
                  : "var(--status-suspended-dot)";

                const textColor = isActive
                  ? "var(--status-active-text)"
                  : isInvited
                  ? "#d97706"
                  : "var(--status-suspended-text)";

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background-color 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "16px 14px", fontWeight: 650, color: "var(--text-dark)", fontSize: "var(--text-sm)" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "16px 14px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                      {item.username || item.email || "-"}
                    </td>
                    <td style={{ padding: "16px 14px", fontSize: "var(--text-sm)" }}>
                      {item.telegram_user ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            backgroundColor: "#f0fdfa",
                            color: "var(--primary-teal)",
                            border: "1px solid #ccfbf1",
                            padding: "3px 9px",
                            borderRadius: "6px",
                            fontWeight: 600,
                            fontSize: "12px",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="m22 2-7 20-4-9-9-4Z" />
                            <path d="M22 2 11 13" />
                          </svg>
                          {item.telegram_user.username ? `@${item.telegram_user.username}` : item.telegram_user.telegram_id || "Terkait"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          backgroundColor: "#10212a",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "4px 12px",
                          borderRadius: "9999px",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="7" r="4" />
                          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                        </svg>
                        {roleLabel}
                      </span>
                    </td>
                    <td style={{ padding: "16px 14px", fontSize: "var(--text-sm)" }}>
                      {div && div !== "none" ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor: div === "after_sales" ? "#eff6ff" : "#fdf4ff",
                            color: div === "after_sales" ? "#1d4ed8" : "#a21caf",
                            border: `1px solid ${div === "after_sales" ? "#bfdbfe" : "#f5d0fe"}`,
                          }}
                        >
                          {divisionLabel}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 14px", fontSize: "var(--text-sm)", fontWeight: 500 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: textColor,
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: dotColor,
                          }}
                        />
                        {statusLabel}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td style={{ padding: "16px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => onEditUser?.(item)}
                            title="Edit Pengguna"
                            style={{
                              background: "none",
                              border: "1px solid var(--border-light)",
                              cursor: "pointer",
                              padding: "6px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                              transition: "border-color 0.15s ease, color 0.15s ease",
                              outline: "none",
                              transform: "none",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--primary-teal)";
                              e.currentTarget.style.color = "var(--primary-teal)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-light)";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUser?.(item)}
                            title="Hapus Pengguna"
                            style={{
                              background: "none",
                              border: "1px solid var(--border-light)",
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
                              e.currentTarget.style.borderColor = "#f87171";
                              e.currentTarget.style.color = "#dc2626";
                              e.currentTarget.style.backgroundColor = "#fef2f2";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-light)";
                              e.currentTarget.style.color = "#ef4444";
                              e.currentTarget.style.backgroundColor = "transparent";
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
