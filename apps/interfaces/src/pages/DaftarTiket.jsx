import { useState, useMemo, useEffect, useCallback } from "react";
import TicketFilterBar from "../components/tickets/TicketFilterBar.jsx";
import TicketTable from "../components/tickets/TicketTable.jsx";
import TicketDetailDrawer from "../components/tickets/TicketDetailDrawer.jsx";
import ExportReportModal from "../components/tickets/ExportReportModal.jsx";
import { downloadTicketReport } from "../lib/exportReport.js";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function DaftarTiket() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("6m");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const itemsPerPage = 10;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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
      setTickets(data);
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
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setSelectedTicket((prev) => (prev?.id === updated.id ? updated : prev));
        showToast(`Tiket ${updated.id} diperbarui via real-time`);
      } catch (err) {
        console.error("Error parsing ticket_updated SSE:", err);
      }
    });

    eventSource.addEventListener("ticket_created", (event) => {
      try {
        const created = JSON.parse(event.data);
        setTickets((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        showToast(`Tiket baru masuk: ${created.id}`);
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
            setTickets((prev) => prev.map((t) => (t.id === ticketId ? fresh : t)));
            setSelectedTicket((prev) => (prev?.id === ticketId ? fresh : prev));
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
  }, [accessToken]);

  // Listen to header export button event
  useEffect(() => {
    const handleHeaderExport = () => {
      setIsExportModalOpen(true);
    };
    window.addEventListener("export-laporan-modal", handleHeaderExport);
    return () => window.removeEventListener("export-laporan-modal", handleHeaderExport);
  }, []);

  // Distinct filter options extracted from tickets
  const { components, clients, locations } = useMemo(() => {
    const comps = [...new Set(tickets.map((t) => t.component).filter(Boolean))].sort();
    const cls = [...new Set(tickets.map((t) => t.client).filter(Boolean))].sort();
    const locs = [...new Set(tickets.map((t) => t.location).filter(Boolean))].sort();
    return { components: comps, clients: cls, locations: locs };
  }, [tickets]);

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
        if (!matchId && !matchUnit && !matchComponent && !matchClient && !matchFailure) {
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

      return true;
    });
  }, [tickets, searchTerm, selectedComponent, selectedClient, selectedLocation, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  // Handle select ticket: fetch fresh detail with history
  const handleSelectTicket = async (t) => {
    setSelectedTicket(t);
    try {
      const res = await api.get(`/tickets/${t.id}`);
      if (res.data?.data) {
        setSelectedTicket(res.data.data);
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
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSelectedTicket(updated);
        showToast(`Status tiket ${updated.id} berhasil diperbarui.`);
        return updated;
      }
    } catch (err) {
      console.error("Error updating ticket:", err);
      const msg = err.response?.data?.message || "Gagal memperbarui tiket.";
      showToast(msg);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
            fontWeight: 600,
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
