import { useState } from "react";

export default function TicketTable({
  tickets = [],
  totalTickets = 0,
  searchTerm = "",
  setSearchTerm,
  onSelectTicket,
  selectedTicketId = null,
  onExportExcel,
  onExportPdf,
  currentPage = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  loading = false,
}) {
  const [sortAsc, setSortAsc] = useState(false);

  // Status Badge Component
  const renderStatusBadge = (status) => {
    const s = String(status || "open").toLowerCase();
    switch (s) {
      case "open":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
            </svg>
            open
          </span>
        );
      case "escalated":
      case "monitor":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#d97706",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            escalated
          </span>
        );
      case "solved":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#16a34a",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            solved
          </span>
        );
      case "closed":
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
            </svg>
            closed
          </span>
        );
    }
  };

  // Severity Indicator Component
  const renderSeverity = (severity) => {
    const s = String(severity || "rendah").toLowerCase();
    let color = "#3b82f6"; // rendah = Blue
    if (s === "sedang") color = "#f59e0b"; // sedang = Amber
    if (s === "tinggi") color = "#ef4444"; // tinggi = Red

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "2px",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {s}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface-card)",
        borderRadius: "14px",
        border: "1px solid var(--border-light)",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      {/* Top Search & Actions Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "380px",
          }}
        >
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
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari tiket, unit, component, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--surface-hover)",
              fontSize: "var(--text-sm)",
              color: "var(--text-dark)",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-light)")}
          />
        </div>

        {/* Right Section: Total Counter & Export buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--text-dark)",
            }}
          >
            {totalTickets} tiket
          </span>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={onExportExcel}
            title="Download Excel"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "#ffffff",
              color: "var(--text-dark)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Excel
          </button>

          {/* PDF Export Button */}
          <button
            type="button"
            onClick={onExportPdf}
            title="Download PDF"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#11222c",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3443")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#11222c")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "#fafbfc" }}>
              <th style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "13%" }}>
                Ticket ID
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "13%" }}>
                Unit
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "13%" }}>
                Component
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "9%" }}>
                Failure
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "10%" }}>
                Severity
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "11%" }}>
                Status
              </th>
              <th style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 650, color: "var(--text-muted)", width: "15%" }}>
                PIC / Tim
              </th>
              <th
                onClick={() => setSortAsc(!sortAsc)}
                style={{
                  padding: "14px 18px",
                  fontSize: "13px",
                  fontWeight: 650,
                  color: "var(--text-muted)",
                  width: "12%",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Dibuat
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </th>
              <th style={{ padding: "14px 16px", width: "4%" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
                  Memuat data tiket dari server...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
                  Tidak ada tiket yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                const members = t.assignedMembers || [];
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "var(--primary-teal-light)" : "transparent",
                      transition: "background-color 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Ticket ID */}
                    <td
                      style={{
                        padding: "16px 20px",
                        color: "var(--primary-teal)",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "13px",
                      }}
                    >
                      {t.id}
                    </td>

                    {/* Unit & Client */}
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-dark)", fontSize: "var(--text-sm)" }}>
                          {t.unit}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>
                          {t.client}
                        </span>
                      </div>
                    </td>

                    {/* Component */}
                    <td style={{ padding: "16px 18px", color: "var(--text-dark)", fontSize: "var(--text-sm)", fontWeight: 500 }}>
                      {t.component}
                    </td>

                    {/* Failure Code */}
                    <td style={{ padding: "16px 18px", color: "var(--text-muted)", fontSize: "13px", fontFamily: "monospace" }}>
                      {t.failureCode}
                    </td>

                    {/* Severity */}
                    <td style={{ padding: "16px 18px" }}>
                      {renderSeverity(t.severity)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 18px" }}>
                      {renderStatusBadge(t.status)}
                    </td>

                    {/* PIC / Tim Penanganan */}
                    <td style={{ padding: "16px 18px" }}>
                      {members.length > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: "#0e8587",
                              color: "#ffffff",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              textTransform: "uppercase",
                            }}
                          >
                            {(members[0].name || "U").slice(0, 2)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: "12.5px",
                                fontWeight: 650,
                                color: "var(--text-dark)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "105px",
                              }}
                              title={members[0].name}
                            >
                              {members[0].name}
                            </span>
                            {members.length > 1 && (
                              <span style={{ fontSize: "10.5px", color: "#0e8587", fontWeight: 600 }}>
                                +{members.length - 1} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#94a3b8",
                            fontSize: "11px",
                            fontWeight: 500,
                            fontStyle: "italic",
                          }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Dibuat */}
                    <td style={{ padding: "16px 18px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                      {t.createdDateText}
                    </td>

                    {/* Arrow action */}
                    <td style={{ padding: "16px 16px", textAlign: "right", color: "var(--text-muted)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderTop: "1px solid var(--border-light)",
          backgroundColor: "#ffffff",
        }}
      >
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Halaman {currentPage} dari {totalPages || 1}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: currentPage <= 1 ? "#f8fafc" : "#ffffff",
              color: currentPage <= 1 ? "#94a3b8" : "var(--text-dark)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Sebelumnya
          </button>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: currentPage >= totalPages ? "#f8fafc" : "#ffffff",
              color: currentPage >= totalPages ? "#94a3b8" : "var(--text-dark)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            Berikutnya
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
