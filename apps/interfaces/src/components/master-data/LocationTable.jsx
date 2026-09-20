export default function LocationTable({ locations, loading, onEdit, onDelete }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
            <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "45%" }}>
              Nama Lokasi
            </th>
            <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "25%" }}>
              Total Asset
            </th>
            <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "18%" }}>
              Status
            </th>
            <th style={{ padding: "12px 16px", width: "12%", textAlign: "right" }}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                Memuat data lokasi...
              </td>
            </tr>
          ) : locations.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                Belum ada data lokasi.
              </td>
            </tr>
          ) : (
            locations.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--border-light)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Nama */}
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-dark)" }}>
                    {item.name}
                  </span>
                </td>

                {/* Total Asset */}
                <td style={{ padding: "14px 16px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: (item._count?.assets || 0) > 0 ? "#f0fdf4" : "#f1f5f9",
                      color: (item._count?.assets || 0) > 0 ? "#16a34a" : "#64748b",
                    }}
                  >
                    📍 {item._count?.assets || 0} Unit
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: "14px 16px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: item.isActive ? "#dcfce7" : "#fee2e2",
                      color: item.isActive ? "#15803d" : "#b91c1c",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: item.isActive ? "#22c55e" : "#ef4444",
                      }}
                    />
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>

                {/* Aksi */}
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Edit Lokasi"
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
                        e.currentTarget.style.color = "var(--primary-teal)";
                        e.currentTarget.style.borderColor = "var(--primary-teal)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.borderColor = "var(--border-light)";
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      title="Hapus Lokasi"
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
                        e.currentTarget.style.backgroundColor = "#fef2f2";
                        e.currentTarget.style.borderColor = "#f87171";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "var(--border-light)";
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
