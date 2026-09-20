export default function AssetTable({ assets, loading, onEdit, onDelete }) {
  const formatCommissioningDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "OPERATIONAL") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 9px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#dcfce7",
            color: "#15803d",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
          Operasional
        </span>
      );
    }
    if (s === "MAINTENANCE") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 9px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#fef3c7",
            color: "#b45309",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
          Maintenance
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 9px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 600,
          backgroundColor: "#f1f5f9",
          color: "#475569",
        }}
      >
        {status || "-"}
      </span>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "16%" }}>
              Unit Code
            </th>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "12%" }}>
              Tipe
            </th>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "18%" }}>
              Client
            </th>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "16%" }}>
              Lokasi
            </th>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "14%" }}>
              Kondisi
            </th>
            <th style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", width: "12%" }}>
              Commissioning
            </th>
            <th style={{ padding: "12px 14px", width: "12%", textAlign: "right" }}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                Memuat data asset...
              </td>
            </tr>
          ) : assets.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                Belum ada data asset robot.
              </td>
            </tr>
          ) : (
            assets.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--border-light)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Unit Code */}
                <td style={{ padding: "14px 14px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#0369a1",
                      backgroundColor: "#e0f2fe",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.unitCode}
                  </span>
                </td>

                {/* Tipe */}
                <td style={{ padding: "14px 14px" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-dark)", textTransform: "capitalize" }}>
                    {item.type}
                  </span>
                </td>

                {/* Client */}
                <td style={{ padding: "14px 14px" }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-dark)" }}>
                    {item.client?.name || "-"}
                  </span>
                </td>

                {/* Lokasi */}
                <td style={{ padding: "14px 14px" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    {item.location?.name || "-"}
                  </span>
                </td>

                {/* Status / Kondisi */}
                <td style={{ padding: "14px 14px" }}>
                  {renderStatusBadge(item.status)}
                </td>

                {/* Commissioning */}
                <td style={{ padding: "14px 14px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {formatCommissioningDate(item.commissioningDate)}
                  </span>
                </td>

                {/* Aksi */}
                <td style={{ padding: "14px 14px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Edit Asset"
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
                      title="Hapus Asset"
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
