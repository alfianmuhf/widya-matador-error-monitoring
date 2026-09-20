import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuditLogPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState(new Set());

  const debounceTimeout = useRef(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const hasMore = logs.length < (meta.total || 0);
  hasMoreRef.current = hasMore;
  loadingRef.current = loading;
  loadingMoreRef.current = loadingMore;

  // -------------------------------------------------------------------------
  // Fetch initial page (strictly 15 records) or reset on search
  // -------------------------------------------------------------------------
  const fetchAuditLogs = useCallback(async (searchQuery = "") => {
    loadingRef.current = true;
    setLoading(true);
    pageRef.current = 1;
    setNewlyAddedIds(new Set());

    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", "15");
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
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
            page: 1,
            limit: 15,
            totalPages: Math.ceil(dataLogs.length / 15) || 1,
          };
        setMeta(newMeta);
        hasMoreRef.current = dataLogs.length < (newMeta.total || 0);
      }
    } catch (e) {
      console.error("Gagal mengambil data audit log:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Load next batch on scroll with 1-second visible delay & smooth entrance
  // -------------------------------------------------------------------------
  const loadMoreLogs = useCallback(async () => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;

    try {
      // Tahan 1 detik agar proses loading di bagian bawah terlihat jelas
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const params = new URLSearchParams();
      params.append("page", String(nextPage));
      params.append("limit", "15");
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data) {
        const newLogs = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.logs || [];

        const newIds = new Set(newLogs.map((item) => item.id));
        setNewlyAddedIds(newIds);

        setLogs((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const filteredNew = newLogs.filter((item) => !existingIds.has(item.id));
          return [...prev, ...filteredNew];
        });

        pageRef.current = nextPage;
        if (res.data.meta || res.data.data?.meta) {
          const updatedMeta = res.data.meta || res.data.data?.meta;
          setMeta(updatedMeta);
          hasMoreRef.current = (logs.length + newLogs.length) < (updatedMeta.total || 0);
        }

        // Hapus flag penanda baris baru setelah 2 detik
        setTimeout(() => {
          setNewlyAddedIds(new Set());
        }, 2000);
      }
    } catch (e) {
      console.error("Gagal memuat data audit log selanjutnya:", e);
    } finally {
      // Jeda 500ms agar user bisa melihat baris baru dan scroll ke bawah lagi dengan nyaman
      setTimeout(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }, 500);
    }
  }, [search, logs.length]);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchAuditLogs("");
  }, [fetchAuditLogs]);

  // -------------------------------------------------------------------------
  // Robust Scroll Detection: Checks both <main> element and window
  // Only triggers when the user ACTUALLY scrolls to the bottom
  // -------------------------------------------------------------------------
  useEffect(() => {
    const mainEl = document.querySelector("main");

    const checkScrollPosition = () => {
      if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;

      let atBottom = false;

      // 1. Cek scrolling pada kontainer <main> (jika <main> yang overflow)
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 20) {
        const remaining = mainEl.scrollHeight - (mainEl.scrollTop + mainEl.clientHeight);
        if (mainEl.scrollTop > 40 && remaining <= 80) {
          atBottom = true;
        }
      }

      // 2. Cek scrolling pada window / document (jika window yang overflow)
      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
      const clientHeight = window.innerHeight || doc.clientHeight || 0;
      const scrollHeight = Math.max(
        doc.scrollHeight,
        body.scrollHeight,
        doc.offsetHeight,
        body.offsetHeight
      );
      const remainingWindow = scrollHeight - (scrollTop + clientHeight);

      if (scrollTop > 40 && remainingWindow <= 80) {
        atBottom = true;
      }

      if (atBottom) {
        loadMoreLogs();
      }
    };

    if (mainEl) {
      mainEl.addEventListener("scroll", checkScrollPosition, { passive: true });
    }
    window.addEventListener("scroll", checkScrollPosition, { passive: true });

    return () => {
      if (mainEl) {
        mainEl.removeEventListener("scroll", checkScrollPosition);
      }
      window.removeEventListener("scroll", checkScrollPosition);
    };
  }, [loadMoreLogs]);

  // -------------------------------------------------------------------------
  // Search input (debounced)
  // -------------------------------------------------------------------------
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchAuditLogs(value);
    }, 350);
  };

  // -------------------------------------------------------------------------
  // Real-time updates via Server-Sent Events (SSE)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!accessToken) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const sseUrl = `${baseURL}/audit-logs/stream?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(sseUrl, { withCredentials: true });

    es.addEventListener("log_created", (ev) => {
      try {
        const newLog = JSON.parse(ev.data);
        if (newLog?.id) {
          setLogs((prev) =>
            prev.some((l) => l.id === newLog.id) ? prev : [newLog, ...prev]
          );
          setMeta((p) => ({ ...p, total: (p.total || 0) + 1 }));
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
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [accessToken]);

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
    <div style={{ width: "100%", paddingBottom: "32px" }}>
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

        {/* Bottom Loading Indicator when 1s delay is running */}
        {loadingMore && (
          <div
            style={{
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#f0fdfa",
              color: "#0f766e",
              fontSize: "13px",
              fontWeight: 600,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                border: "2.5px solid #99f6e4",
                borderTop: "2.5px solid #0f766e",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>Memuat 15 data log berikutnya...</span>
          </div>
        )}

        {/* Footer info and manual trigger button */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#fafbfc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12.5px",
            color: "#64748b",
          }}
        >
          <div>
            Menampilkan <strong style={{ color: "#0f172a" }}>{logs.length}</strong> dari{" "}
            <strong style={{ color: "#0f172a" }}>{meta.total || logs.length}</strong> rekaman audit log
          </div>

          <div>
            {!hasMore && logs.length > 0 ? (
              <span style={{ color: "#0f766e", fontWeight: 600 }}>
                Semua {meta.total} rekaman audit log telah selesai ditampilkan ✓
              </span>
            ) : hasMore ? (
              <button
                type="button"
                onClick={loadMoreLogs}
                disabled={loadingMore}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0e8587",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  transition: "background-color 0.15s ease, border-color 0.15s ease",
                  outline: "none",
                  transform: "none",
                }}
                onMouseEnter={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.backgroundColor = "#f0fdfa";
                    e.currentTarget.style.borderColor = "#0e8587";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                Scroll ke bawah atau klik untuk muat 15 data lagi ↓
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
