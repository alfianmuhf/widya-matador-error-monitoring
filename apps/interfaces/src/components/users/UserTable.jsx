import InfoBanner from "../common/InfoBanner.jsx";

export default function UserTable({
  users = [],
  loading = false,
  canManageUsers = true,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${mins}`;
    } catch {
      return "-";
    }
  };

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
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "24%" }}>
                Nama
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "24%" }}>
                Email
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "16%" }}>
                Peran
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "18%" }}>
                Login terakhir
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "12%" }}>
                Status
              </th>
              <th style={{ padding: "12px 14px", width: "6%" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Memuat data pengguna...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Belum ada data pengguna dashboard.
                </td>
              </tr>
            ) : (
              users.map((item) => {
                const isActive = item.status === "ACTIVE";
                const roleLabel = item.role === "ADMIN" ? "Admin"
                  : item.role === "COORDINATOR" ? "Coordinator"
                  : "Viewer";

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
                      {item.email}
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
                    <td style={{ padding: "16px 14px", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                      {formatDate(item.lastLoginAt)}
                    </td>
                    <td style={{ padding: "16px 14px", fontSize: "var(--text-sm)", fontWeight: 500 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: isActive ? "var(--status-active-text)" : "var(--status-suspended-text)",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: isActive ? "var(--status-active-dot)" : "var(--status-suspended-dot)",
                          }}
                        />
                        {isActive ? "Aktif" : item.status === "INVITED" ? "Diundang" : "Nonaktif"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 14px", textAlign: "right" }}>
                      {canManageUsers ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => onEditUser?.(item)}
                            title="Edit Pengguna"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
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
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUser?.(item)}
                            title="Hapus Pengguna"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease",
                              outline: "none",
                              transform: "none",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#ef4444";
                              e.currentTarget.style.color = "#dc2626";
                              e.currentTarget.style.backgroundColor = "#fef2f2";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-light)";
                              e.currentTarget.style.color = "var(--text-muted)";
                              e.currentTarget.style.backgroundColor = "#ffffff";
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>-</span>
                      )}
                    </td>
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
