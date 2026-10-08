import { useState, useMemo, useEffect, useCallback } from "react";
import TicketFilterBar from "../components/tickets/TicketFilterBar.jsx";
import TicketTable from "../components/tickets/TicketTable.jsx";
import TicketDetailDrawer from "../components/tickets/TicketDetailDrawer.jsx";
import ExportReportModal from "../components/tickets/ExportReportModal.jsx";
import { downloadTicketReport } from "../lib/exportReport.js";
import { DEFAULT_TEAM_MEMBERS } from "../lib/ticketAssignees.js";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function DaftarTiket() {
  const { accessToken, user } = useAuth();
  const currentUser = user?.user || user;

  const [rawTickets, setRawTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("6m");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Available users for assignment
  const [availableUsers, setAvailableUsers] = useState(DEFAULT_TEAM_MEMBERS);
  // Assignments map version counter to trigger reactive re-render
  const [assignmentVersion, setAssignmentVersion] = useState(0);

  const itemsPerPage = 10;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper normalize assignee dari backend
  const normalizeAssignee = useCallback((a) => {
    if (!a) return null;
    return {
      id: a.id,
      ticketId: a.ticketId || a.ticket_id,
      name: a.name || a.user?.name || a.telegramUser?.full_name || a.telegramUser?.username || "Anggota Tim",
      email: a.identifier || a.user?.email || (a.telegramUser?.username ? `@${a.telegramUser.username}` : (a.email || "")),
      role: a.user?.role?.toUpperCase() || (a.telegramUser ? "TELEGRAM" : (a.role || "TEKNISI")),
      isLead: Boolean(a.isLeader || a.isLead),
      isLeader: Boolean(a.isLeader || a.isLead),
      userId: a.userId || a.user_id,
      telegramUserId: a.telegramUserId || a.telegram_user_id,
    };
  }, []);

  // Fetch available users from backend (Users & Telegram Whitelist)
  useEffect(() => {
    Promise.all([
      api.get("/users?limit=50").catch(() => ({ data: { data: { users: [] } } })),
      api.get("/telegram-users?limit=50").catch(() => ({ data: { data: [] } })),
    ])
      .then(([usersRes, teleRes]) => {
        const dbUsers = usersRes.data?.data?.users || usersRes.data?.data || [];
        const teleUsers = teleRes.data?.data?.users || teleRes.data?.data || [];

        const combined = [];
        dbUsers.forEach((u) => {
          combined.push({
            id: u.id,
            userId: u.id,
            name: u.name,
            email: u.email,
            role: u.role?.toUpperCase() || "VIEWER",
            division: u.division,
            source: "web",
          });
        });

        teleUsers.forEach((tg) => {
          combined.push({
            id: tg.id,
            telegramUserId: tg.id,
            name: tg.full_name || tg.username || `Telegram (${tg.telegram_id})`,
            email: tg.username ? `@${tg.username}` : tg.telegram_id,
            role: "TELEGRAM",
            division: tg.division,
            source: "telegram",
          });
        });

        if (combined.length > 0) {
          setAvailableUsers(combined);
        } else {
          setAvailableUsers(DEFAULT_TEAM_MEMBERS);
        }
      })
      .catch(() => {
        setAvailableUsers(DEFAULT_TEAM_MEMBERS);
      });
  }, []);

  // Fetch tickets from Backend API
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/tickets", {
        params: {
          limit: 500, // fetch all tickets for interactive filtering and pagination
        },
      });
      const data = res.data?.data || [];
      setRawTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      showToast("Gagal memuat data tiket dari server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Merge tickets with team assignment info dari API backend
  const tickets = useMemo(() => {
    return rawTickets.map((t) => {
      const backendAssignees = (t.assignees || []).map(normalizeAssignee).filter(Boolean);
      return {
        ...t,
        assignees: backendAssignees,
        assignedMembers: backendAssignees,
      };
    });
  }, [rawTickets, normalizeAssignee]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (!accessToken) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const sseUrl = `${baseURL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("init", () => {
      // Connected to SSE stream
    });

    eventSource.addEventListener("ticket_updated", (event) => {
      try {
        const updated = JSON.parse(event.data);
        const freshAssignees = (updated.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = { ...updated, assignees: freshAssignees, assignedMembers: freshAssignees };

        setRawTickets((prev) =>
          prev.map((t) => (t.id === full.id ? full : t))
        );
        setSelectedTicket((prev) => (prev?.id === full.id ? full : prev));
        showToast(`Tiket ${full.id} diperbarui via real-time`);
      } catch (err) {
        console.error("Error parsing ticket_updated SSE:", err);
      }
    });

    eventSource.addEventListener("ticket_created", (event) => {
      try {
        const created = JSON.parse(event.data);
        const freshAssignees = (created.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = { ...created, assignees: freshAssignees, assignedMembers: freshAssignees };

        setRawTickets((prev) => [full, ...prev.filter((t) => t.id !== full.id)]);
        showToast(`Tiket baru masuk: ${full.id}`);
      } catch (err) {
        console.error("Error parsing ticket_created SSE:", err);
      }
    });

    eventSource.addEventListener("ticket_comment_added", (event) => {
      try {
        const { ticketId } = JSON.parse(event.data);
        // Refresh ticket detail if currently opened
        api.get(`/tickets/${ticketId}`).then((res) => {
          const fresh = res.data?.data;
          if (fresh) {
            const freshAssignees = (fresh.assignees || []).map(normalizeAssignee).filter(Boolean);
            const full = { ...fresh, assignees: freshAssignees, assignedMembers: freshAssignees };

            setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
            setSelectedTicket((prev) => (prev?.id === ticketId ? full : prev));
          }
        }).catch(() => {});
      } catch (err) {
        console.error("Error parsing ticket_comment_added SSE:", err);
      }
    });

    eventSource.onerror = () => {
      // EventSource auto-reconnects automatically on connection drops
    };

    return () => {
      eventSource.close();
    };
  }, [accessToken, normalizeAssignee]);

  // Listen to header export button event
  useEffect(() => {
    const handleHeaderExport = () => {
      setIsExportModalOpen(true);
    };
    window.addEventListener("export-laporan-modal", handleHeaderExport);
    return () => window.removeEventListener("export-laporan-modal", handleHeaderExport);
  }, []);

  // Distinct filter options extracted from tickets
  const { components, clients, locations, teamMembersList } = useMemo(() => {
    const comps = [...new Set(tickets.map((t) => t.component).filter(Boolean))].sort();
    const cls = [...new Set(tickets.map((t) => t.client).filter(Boolean))].sort();
    const locs = [...new Set(tickets.map((t) => t.location).filter(Boolean))].sort();

    // Extract all assigned team members across tickets plus available users
    const memberMap = new Map();
    availableUsers.forEach((u) => {
      memberMap.set(u.name, { id: u.id, name: u.name, role: u.role });
    });
    tickets.forEach((t) => {
      (t.assignedMembers || []).forEach((m) => {
        if (!memberMap.has(m.name)) {
          memberMap.set(m.name, { id: m.id, name: m.name, role: m.role });
        }
      });
    });

    return {
      components: comps,
      clients: cls,
      locations: locs,
      teamMembersList: Array.from(memberMap.values()),
    };
  }, [tickets, availableUsers]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchId = t.id?.toLowerCase().includes(query);
        const matchUnit = t.unit?.toLowerCase().includes(query);
        const matchComponent = t.component?.toLowerCase().includes(query);
        const matchClient = t.client?.toLowerCase().includes(query);
        const matchFailure = t.failureCode?.toLowerCase().includes(query);
        const matchAssignee = (t.assignedMembers || []).some((m) =>
          m.name.toLowerCase().includes(query)
        );

        if (!matchId && !matchUnit && !matchComponent && !matchClient && !matchFailure && !matchAssignee) {
          return false;
        }
      }

      // Dropdowns
      if (selectedComponent && t.component !== selectedComponent) return false;
      if (selectedClient && t.client !== selectedClient) return false;
      if (selectedLocation && t.location !== selectedLocation) return false;
      if (selectedStatus) {
        const queryStatus = selectedStatus.toLowerCase();
        const itemStatus = (t.status || "").toLowerCase();
        if (itemStatus !== queryStatus) return false;
      }

      // Assignee Filter
      if (selectedAssignee) {
        if (selectedAssignee === "unassigned") {
          if (t.assignedMembers && t.assignedMembers.length > 0) return false;
        } else {
          const hasMember = (t.assignedMembers || []).some(
            (m) => m.name.toLowerCase() === selectedAssignee.toLowerCase()
          );
          if (!hasMember) return false;
        }
      }

      return true;
    });
  }, [tickets, searchTerm, selectedComponent, selectedClient, selectedLocation, selectedStatus, selectedAssignee]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  // Handle select ticket: fetch fresh detail with history & assignees from API
  const handleSelectTicket = async (t) => {
    const initialAssignees = (t.assignees || t.assignedMembers || []).map(normalizeAssignee).filter(Boolean);
    setSelectedTicket({ ...t, assignees: initialAssignees, assignedMembers: initialAssignees });

    try {
      const res = await api.get(`/tickets/${t.id}`);
      if (res.data?.data) {
        const fresh = res.data.data;
        const freshAssignees = (fresh.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = {
          ...fresh,
          assignees: freshAssignees,
          assignedMembers: freshAssignees,
        };
        setSelectedTicket(full);
        setRawTickets((prev) => prev.map((item) => (item.id === t.id ? full : item)));
      }
    } catch {
      // fallback to selected item
    }
  };

  // Handle update status / comment via Backend API
  const handleUpdateTicket = async (ticketId, payload) => {
    try {
      const res = await api.patch(`/tickets/${ticketId}`, payload);
      const updated = res.data?.data;
      if (updated) {
        const freshAssignees = (updated.assignees || []).map(normalizeAssignee).filter(Boolean);
        const fullUpdated = { ...updated, assignees: freshAssignees, assignedMembers: freshAssignees };

        setRawTickets((prev) => prev.map((t) => (t.id === updated.id ? fullUpdated : t)));
        setSelectedTicket(fullUpdated);
        showToast(`Status tiket ${updated.id} berhasil diperbarui.`);
        return fullUpdated;
      }
    } catch (err) {
      console.error("Error updating ticket:", err);
      const msg = err.response?.data?.message || "Gagal memperbarui tiket.";
      showToast(msg);
      throw err;
    }
  };

  // Handle assign member to ticket via Backend API (POST /tickets/:id/assignees)
  const handleAssignMember = async (ticketId, member, isLead) => {
    try {
      const payload = {
        isLeader: Boolean(isLead),
      };
      if (member.telegramUserId) {
        payload.telegramUserId = member.telegramUserId;
      } else if (member.userId) {
        payload.userId = member.userId;
      } else if (member.id && !String(member.id).startsWith("custom-")) {
        payload.userId = member.id;
      } else if (member.email) {
        payload.email = member.email;
      }

      const res = await api.post(`/tickets/${ticketId}/assignees`, payload);
      const updatedTicket = res.data?.data?.ticket;

      if (updatedTicket) {
        const freshAssignees = (updatedTicket.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = { ...updatedTicket, assignees: freshAssignees, assignedMembers: freshAssignees };
        setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
        setSelectedTicket(full);
      } else {
        const freshRes = await api.get(`/tickets/${ticketId}`);
        if (freshRes.data?.data) {
          const fresh = freshRes.data.data;
          const freshAssignees = (fresh.assignees || []).map(normalizeAssignee).filter(Boolean);
          const full = { ...fresh, assignees: freshAssignees, assignedMembers: freshAssignees };
          setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
          setSelectedTicket(full);
        }
      }

      showToast(`Berhasil menugaskan ${member.name} ke tiket ${ticketId}`);
    } catch (err) {
      console.error("Gagal menugaskan anggota tim:", err);
      const msg = err.response?.data?.message || "Gagal menugaskan anggota ke tiket.";
      showToast(msg);
    }
  };

  // Handle remove member from ticket via Backend API (DELETE /tickets/:id/assignees/:assigneeId)
  const handleRemoveMember = async (ticketId, memberId, memberName) => {
    try {
      const res = await api.delete(`/tickets/${ticketId}/assignees/${memberId}`);
      const updatedTicket = res.data?.data?.ticket;

      if (updatedTicket) {
        const freshAssignees = (updatedTicket.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = { ...updatedTicket, assignees: freshAssignees, assignedMembers: freshAssignees };
        setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
        setSelectedTicket(full);
      } else {
        const freshRes = await api.get(`/tickets/${ticketId}`);
        if (freshRes.data?.data) {
          const fresh = freshRes.data.data;
          const freshAssignees = (fresh.assignees || []).map(normalizeAssignee).filter(Boolean);
          const full = { ...fresh, assignees: freshAssignees, assignedMembers: freshAssignees };
          setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
          setSelectedTicket(full);
        }
      }

      showToast(`Penugasan ${memberName || "anggota"} dihapus dari tiket.`);
    } catch (err) {
      console.error("Gagal menghapus anggota tim:", err);
      const msg = err.response?.data?.message || "Gagal menghapus penugasan dari tiket.";
      showToast(msg);
    }
  };

  // Handle adding quick history note directly
  const handleAddHistoryNote = async (ticketId, noteText) => {
    try {
      let updated = null;
      try {
        const res = await api.post(`/tickets/${ticketId}/comments`, { notes: noteText });
        updated = res.data?.data;
      } catch {
        const res = await api.patch(`/tickets/${ticketId}`, { handlingNote: noteText });
        updated = res.data?.data;
      }

      if (updated) {
        const freshAssignees = (updated.assignees || []).map(normalizeAssignee).filter(Boolean);
        const full = { ...updated, assignees: freshAssignees, assignedMembers: freshAssignees };
        setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
        setSelectedTicket(full);
      } else {
        const freshRes = await api.get(`/tickets/${ticketId}`);
        if (freshRes.data?.data) {
          const fresh = freshRes.data.data;
          const freshAssignees = (fresh.assignees || []).map(normalizeAssignee).filter(Boolean);
          const full = { ...fresh, assignees: freshAssignees, assignedMembers: freshAssignees };
          setRawTickets((prev) => prev.map((t) => (t.id === ticketId ? full : t)));
          setSelectedTicket(full);
        }
      }

      showToast("Catatan riwayat berhasil ditambahkan.");
    } catch (err) {
      console.error("Failed to add history note:", err);
      showToast("Gagal menambahkan catatan riwayat.");
      throw err;
    }
  };



  const handleExportDownload = async (format, customDateRange = null) => {
    let compId = undefined;
    if (selectedComponent) {
      const comp = tickets.find((t) => t.component === selectedComponent);
      if (comp?.componentId) compId = comp.componentId;
    }
    let clId = undefined;
    if (selectedClient) {
      const cl = tickets.find((t) => t.client === selectedClient);
      if (cl?.clientId) clId = cl.clientId;
    }
    let locId = undefined;
    if (selectedLocation) {
      const loc = tickets.find((t) => t.location === selectedLocation);
      if (loc?.locationId) locId = loc.locationId;
    }

    await downloadTicketReport(
      format,
      customDateRange || timeRange,
      {
        search: searchTerm,
        status: selectedStatus,
        componentId: compId,
        clientId: clId,
        locationId: locId,
      },
      showToast
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            backgroundColor: "#11222c",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 650,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Filter Bar Toolbar */}
      <TicketFilterBar
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        selectedComponent={selectedComponent}
        setSelectedComponent={setSelectedComponent}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedAssignee={selectedAssignee}
        setSelectedAssignee={setSelectedAssignee}
        teamMembers={teamMembersList}
        components={components}
        clients={clients}
        locations={locations}
      />

      {/* Main Ticket Table Card */}
      <TicketTable
        tickets={paginatedTickets}
        totalTickets={filteredTickets.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectTicket={handleSelectTicket}
        selectedTicketId={selectedTicket?.id}
        onExportExcel={() => handleExportDownload("xlsx")}
        onExportPdf={() => handleExportDownload("pdf")}
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        loading={loading}
      />

      {/* Detail Slideout Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdateTicket={handleUpdateTicket}
        availableUsers={availableUsers}
        onAssignMember={handleAssignMember}
        onRemoveMember={handleRemoveMember}
        onAddHistoryNote={handleAddHistoryNote}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalTickets={filteredTickets.length}
        onExport={handleExportDownload}
      />
    </div>
  );
}
