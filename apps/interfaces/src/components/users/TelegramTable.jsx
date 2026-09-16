import InfoBanner from "../common/InfoBanner.jsx";

export default function TelegramTable({
  telegramUsers = [],
  loading = false,
  onAddTelegramUser,
  onEditTelegramUser,
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
          marginBottom: "18px",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-dark)" }}>
          Whitelist Pengguna Telegram
        </h2>
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
            padding: "9px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah pengguna bot
        </button>
      </div>

      {/* Info Banner PRD FR-BOT-03 */}
      <InfoBanner type="info">
        Hanya pengguna pada daftar ini yang dapat membuat tiket melalui bot (FR-BOT-03 / US-22).
      </InfoBanner>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "30%" }}>
                Nama
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "25%" }}>
                Username
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "25%" }}>
                Telegram ID
              </th>
              <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "14%" }}>
                Status
              </th>
              <th style={{ padding: "12px 14px", width: "6%" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                  Memuat data whitelist Telegram...
                </td>
              </tr>
            ) : telegramUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                  Belum ada ID Telegram di whitelist.
                </td>
              </tr>
            ) : (
              telegramUsers.map((item) => {
                const isActive = item.isActive;
                const formattedUsername = item.username
                  ? item.username.startsWith("@")
                    ? item.username
                    : `@${item.username}`
                  : "-";

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
                    {/* Nama */}
                    <td style={{ padding: "16px 14px", fontWeight: 650, color: "var(--text-dark)", fontSize: "var(--text-sm)" }}>
                      {item.fullName || "Pengguna Telegram"}
                    </td>

                    {/* Username */}
                    <td style={{ padding: "16px 14px", color: "var(--primary-teal)", fontSize: "var(--text-sm)", fontWeight: 500 }}>
                      {formattedUsername}
                    </td>

                    {/* Telegram ID */}
                    <td style={{ padding: "16px 14px", color: "var(--text-dark)", fontSize: "var(--text-sm)", fontFamily: "monospace" }}>
                      {item.telegramId}
                    </td>

                    {/* Status */}
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
                        {isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    {/* Aksi Edit */}
                    <td style={{ padding: "16px 14px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => onEditTelegramUser(item)}
                        title="Edit Data Telegram"
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
                          transition: "all 0.15s ease",
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
