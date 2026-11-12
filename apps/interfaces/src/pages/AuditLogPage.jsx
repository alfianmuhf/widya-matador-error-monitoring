import { useState, useEffect, useCallback, useRef } from "react";
import api, { API_BASE_URL } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuditLogPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState(new Set());

  const itemsPerPage = 15;

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when search query changes
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    setCurrentPage(1);
    setNewlyAddedIds(new Set());
  }, [debouncedSearch]);

  // Fetch audit logs with true server-side pagination
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("limit", String(itemsPerPage));
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim());
      }

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data) {
        const dataLogs = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.logs || [];

        setLogs(dataLogs);
        const newMeta = res.data.meta ||
          res.data.data?.meta || {
            total: dataLogs.length,
            page: currentPage,
            limit: itemsPerPage,
            totalPages: Math.ceil(dataLogs.length / itemsPerPage) || 1,
          };
        setMeta(newMeta);
      }
    } catch (e) {
      console.error("Gagal mengambil data audit log:", e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, itemsPerPage]);

  useEffect(() => {
    if (!accessToken) return;
    fetchAuditLogs();
  }, [accessToken, fetchAuditLogs]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (!accessToken) return;

    const sseUrl = `${API_BASE_URL}/audit-logs/stream?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(sseUrl, { withCredentials: true });

    es.addEventListener("log_created", (ev) => {
      try {
        const newLog = JSON.parse(ev.data);
        if (newLog?.id) {
          if (currentPage === 1 && !debouncedSearch.trim()) {
            setNewlyAddedIds((prev) => new Set([...prev, newLog.id]));
            setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, itemsPerPage));
            setTimeout(() => {
              setNewlyAddedIds((prev) => {
                const next = new Set(prev);
                next.delete(newLog.id);
                return next;
              });
            }, 3000);
          }
          setMeta((p) => {
            const nextTotal = (p.total || 0) + 1;
            return {
              ...p,
              total: nextTotal,
              totalPages: Math.ceil(nextTotal / itemsPerPage) || 1,
            };
          });
        }
      } catch (err) {
        console.error("Gagal memproses SSE audit log:", err);
      }
    });

    es.onerror = (err) => {
      console.warn("SSE audit-log terputus, reconnecting...", err);
    };

    return () => {
      es.close();
    };
  }, [accessToken, currentPage, debouncedSearch, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // -------------------------------------------------------------------------
  // Action colour mapping – matches STANDAR_AUDIT_LOG.md
  // -------------------------------------------------------------------------
  const getActionColor = (aksi) => {
    const a = String(aksi || "").toLowerCase();
    switch (a) {
      case "create":
        return "#15803D"; // emerald green
      case "update":
        return "#B45309"; // amber / orange-brown
      case "status_change":
        return "#0F766E"; // dark teal
      case "delete":
        return "#DC2626"; // red
      default:
        return "#334155";
    }
  };

  const monoFont =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  return (
    <div style={{ width: "100%" }}>
      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e5e9ec",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Card Header with Title and Search Input */}
        <div
          style={{
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Audit Log
            </h2>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              ({logs.length} dari {meta.total || logs.length} ditampilkan)
            </span>
          </div>

          <div style={{ position: "relative", width: "260px", maxWidth: "100%" }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari..."
              value={search}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                width: "100%",
                padding: "8px 14px 8px 34px",
                fontSize: "13.5px",
                backgroundColor: "#ffffff",
                border: isSearchFocused ? "1px solid #0e8587" : "1px solid #cbd5e1",
                boxShadow: isSearchFocused ? "0 0 0 3px rgba(14, 133, 135, 0.12)" : "none",
                borderRadius: "8px",
                outline: "none",
                color: "#0f172a",
                transition: "all 0.15s ease",
              }}
            />
          </div>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13.5px",
            }}
          >
            <thead style={{ backgroundColor: "#eff2f5" }}>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th
                  style={{
                    padding: "12px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    width: "16%",
                  }}
                >
                  Waktu
                </th>
                <th
                  style={{
                    padding: "12px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    width: "18%",
                  }}
                >
                  Pelaku
                </th>
                <th
                  style={{
                    padding: "12px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    width: "20%",
                  }}
                >
                  Objek
                </th>
                <th
                  style={{
                    padding: "12px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    width: "12%",
                  }}
                >
                  Aksi
                </th>
                <th
                  style={{
                    padding: "12px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    width: "34%",
                  }}
                >
                  Detail perubahan
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          border: "3px solid #e2e8f0",
                          borderTop: "3px solid #0e8587",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span style={{ fontSize: "12.5px" }}>Memuat jejak audit log...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "13.5px",
                    }}
                  >
                    Tidak ada catatan jejak audit log ditemukan.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const isNew = newlyAddedIds.has(log.id);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.15s ease",
                        animation: isNew
                          ? "rowFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both"
                          : "none",
                        animationDelay: isNew ? `${Math.min((index % 15) * 25, 300)}ms` : "0ms",
                        backgroundColor: isNew ? "rgba(14, 133, 135, 0.05)" : "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = isNew
                          ? "rgba(14, 133, 135, 0.05)"
                          : "transparent")
                      }
                    >
                      {/* Waktu */}
                      <td
                        style={{
                          padding: "16px 24px",
                          whiteSpace: "nowrap",
                          fontFamily: monoFont,
                          fontSize: "13px",
                          color: "#334155",
                        }}
                      >
                        {log.waktu || "-"}
                      </td>

                      {/* Pelaku */}
                      <td
                        style={{
                          padding: "16px 24px",
                          whiteSpace: "nowrap",
                          fontSize: "13.5px",
                          color: "#1E293B",
                        }}
                      >
                        {log.pelaku || "-"}
                      </td>

                      {/* Objek */}
                      <td
                        style={{
                          padding: "16px 24px",
                          whiteSpace: "nowrap",
                          fontFamily: monoFont,
                          fontSize: "13.5px",
                          fontWeight: 500,
                          color: "#008BA3",
                        }}
                      >
                        {log.objek || "-"}
                      </td>

                      {/* Aksi: Teks polos tebal tanpa badge bubble */}
                      <td
                        style={{
                          padding: "16px 24px",
                          whiteSpace: "nowrap",
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: getActionColor(log.aksi),
                        }}
                      >
                        {log.aksi || "-"}
                      </td>

                      {/* Detail perubahan */}
                      <td
                        style={{
                          padding: "16px 24px",
                          fontSize: "13.5px",
                          color: "#334155",
                          lineHeight: 1.5,
                        }}
                      >
                        {log.detailPerubahan || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with True Server-Side Pagination */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#fafbfc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          <div>
            Menampilkan{" "}
            <strong style={{ color: "#0f172a" }}>
              {meta.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            </strong>{" "}
            -{" "}
            <strong style={{ color: "#0f172a" }}>
              {Math.min(meta.total || 0, currentPage * itemsPerPage)}
            </strong>{" "}
            dari <strong style={{ color: "#0f172a" }}>{meta.total || 0}</strong> rekaman audit log
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Halaman {currentPage} dari {meta.totalPages || 1}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setNewlyAddedIds(new Set());
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage <= 1 || loading ? "#f8fafc" : "#ffffff",
                  color: currentPage <= 1 || loading ? "#94a3b8" : "#334155",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: currentPage <= 1 || loading ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Sebelumnya
              </button>

              <button
                type="button"
                disabled={currentPage >= (meta.totalPages || 1) || loading}
                onClick={() => {
                  setCurrentPage((p) => Math.min(meta.totalPages || 1, p + 1));
                  setNewlyAddedIds(new Set());
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage >= (meta.totalPages || 1) || loading ? "#f8fafc" : "#ffffff",
                  color: currentPage >= (meta.totalPages || 1) || loading ? "#94a3b8" : "#334155",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: currentPage >= (meta.totalPages || 1) || loading ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
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
      </div>
    </div>
  );
}
