import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import api, { API_BASE_URL } from "../../lib/api.js";

export default function Sidebar() {
  const location = useLocation();
  const { user, accessToken } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";
  const isViewer = userRole === "viewer";
  const canManageTickets = isAdmin || isCoordinator;

  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [manageTicketsCount, setManageTicketsCount] = useState(0);

  const fetchManagedTicketsCount = () => {
    if (!canManageTickets) return;
    api.get("/ticket-management")
      .then((res) => {
        const count = res.data?.data?.length ?? 0;
        setManageTicketsCount(count);
      })
      .catch(() => {});
  };

  const updateCountsFromSummary = (data) => {
    if (!data) return;
    const open = data.kpis?.openTickets ?? 0;
    setOpenTicketsCount(open);
  };

  useEffect(() => {
    if (!accessToken) return;
    // Initial fetch
    api.get("/summary?timeRange=all")
      .then((res) => {
        updateCountsFromSummary(res.data?.data);
      })
      .catch(() => {});

    if (canManageTickets) {
      fetchManagedTicketsCount();
    }

    // Real-time live updates via Server-Sent Events (SSE)
    const sseUrl = `${API_BASE_URL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("init", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.openTicketsCount !== undefined) {
          setOpenTicketsCount(payload.openTicketsCount);
        }
      } catch {}
    });

    const handleTicketChange = () => {
      api.get("/summary?timeRange=all")
        .then((res) => {
          updateCountsFromSummary(res.data?.data);
        })
        .catch(() => {});

      if (canManageTickets) {
        fetchManagedTicketsCount();
      }
    };

    eventSource.addEventListener("ticket_created", handleTicketChange);
    eventSource.addEventListener("ticket_updated", handleTicketChange);

    return () => {
      eventSource.close();
    };
  }, [accessToken, canManageTickets]);

  const navItems = [
    {
      to: "/",
      label: "Ringkasan",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      to: "/analitik-error",
      label: "Analitik Error",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      to: "/daftar-tiket",
      label: "Daftar Tiket",
      badge: openTicketsCount > 0 ? openTicketsCount : null,
      badgeBg: "#ef4444",
      badgeColor: "#ffffff",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      ),
    },
    // Menu Manajemen Tiket untuk role COORDINATOR (Aftersales & Software) & ADMIN
    ...(canManageTickets
      ? [
          {
            to: "/manajemen-tiket",
            label: "Manajemen Tiket",
            badge: manageTicketsCount > 0 ? manageTicketsCount : null,
            badgeBg: "#0e8587",
            badgeColor: "#ffffff",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            ),
          },
        ]
      : []),
    {
      to: "/master-data",
      label: "Master Data",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
    ...(!isViewer
      ? [
          {
            to: "/pengguna-whitelist",
            label: "Pengguna & Whitelist",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          },
        ]
      : []),
    {
      to: "/audit-log",
      label: "Audit Log",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      style={{
        width: "250px",
        minWidth: "250px",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        backgroundColor: "var(--sidebar-bg)",
        color: "var(--sidebar-text)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRight: "1px solid var(--sidebar-border)",
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            padding: "24px 20px 28px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: "var(--primary-teal)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              ERAD
            </div>
            <div
              style={{
                color: "#38bdf8",
                fontSize: "0.625rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              LOAD SCANNER AFTERSALES
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ padding: "0 12px" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: isActive ? "#ffffff" : "#94a3b8",
                      backgroundColor: isActive ? "var(--sidebar-active-bg)" : "transparent",
                      transition: "background-color 0.15s ease, color 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        style={{
                          backgroundColor: item.badgeBg || (isActive ? "rgba(0, 0, 0, 0.25)" : "rgba(14, 133, 135, 0.25)"),
                          color: item.badgeColor || (isActive ? "#ffffff" : "#38bdf8"),
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "9999px",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
