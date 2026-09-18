import { useState, useMemo, useEffect } from "react";
import TicketFilterBar from "../components/tickets/TicketFilterBar.jsx";
import TicketTable from "../components/tickets/TicketTable.jsx";
import TicketDetailDrawer from "../components/tickets/TicketDetailDrawer.jsx";
import ExportReportModal from "../components/tickets/ExportReportModal.jsx";
import { INITIAL_TICKETS } from "../data/mockTickets.js";

export default function DaftarTiket() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
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

  // Listen to header export button event
  useEffect(() => {
    const handleHeaderExport = () => {
      setIsExportModalOpen(true);
    };
    window.addEventListener("export-laporan-modal", handleHeaderExport);
    return () => window.removeEventListener("export-laporan-modal", handleHeaderExport);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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
        const matchId = t.id.toLowerCase().includes(query);
        const matchUnit = t.unit.toLowerCase().includes(query);
        const matchComponent = t.component.toLowerCase().includes(query);
        const matchClient = t.client.toLowerCase().includes(query);
        const matchFailure = t.failureCode?.toLowerCase().includes(query);
        if (!matchId && !matchUnit && !matchComponent && !matchClient && !matchFailure) {
          return false;
        }
      }

      // Dropdowns
      if (selectedComponent && t.component !== selectedComponent) return false;
      if (selectedClient && t.client !== selectedClient) return false;
      if (selectedLocation && t.location !== selectedLocation) return false;
      if (selectedStatus && t.status !== selectedStatus) return false;

      return true;
    });
  }, [tickets, searchTerm, selectedComponent, selectedClient, selectedLocation, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const handleUpdateTicket = (updated) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTicket(updated);
    showToast(`Status tiket ${updated.id} berhasil diperbarui.`);
  };

  const handleExportDownload = (format) => {
    // Generate CSV data for demonstration
    const headers = ["Ticket ID", "Unit", "Client", "Component", "Failure Code", "Severity", "Status", "Tanggal"];
    const rows = filteredTickets.map((t) => [
      t.id,
      t.unit,
      `"${t.client}"`,
      `"${t.component}"`,
      t.failureCode,
      t.severity,
      t.status,
      t.createdDateText,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `laporan-tiket-aftersales-${format}.${format === "pdf" ? "pdf" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Laporan format ${format.toUpperCase()} berhasil diekspor.`);
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
        onSelectTicket={(ticket) => setSelectedTicket(ticket)}
        selectedTicketId={selectedTicket?.id}
        onExportExcel={() => handleExportDownload("xlsx")}
        onExportPdf={() => handleExportDownload("pdf")}
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
