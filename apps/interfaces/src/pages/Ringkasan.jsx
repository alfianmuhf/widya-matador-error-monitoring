import { useState, useEffect, useCallback, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useAuth } from "../context/AuthContext.jsx";
import api, { API_BASE_URL } from "../lib/api.js";
import ExportReportModal from "../components/tickets/ExportReportModal.jsx";
import { downloadTicketReport } from "../lib/exportReport.js";

const TIME_RANGES = [
  { id: "30d", label: "30 hari" },
  { id: "90d", label: "90 hari" },
  { id: "6m", label: "6 bulan" },
  { id: "all", label: "Semua" },
];

export default function Ringkasan() {
  const { accessToken } = useAuth();
  const [timeRange, setTimeRange] = useState("6m");
  const [selectedComponent, setSelectedComponent] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Listen to header export button event
  useEffect(() => {
    const handleOpenExport = () => setIsExportModalOpen(true);
    window.addEventListener("export-laporan-modal", handleOpenExport);
    return () => window.removeEventListener("export-laporan-modal", handleOpenExport);
  }, []);

  const handleExportDownload = async (format, customDateRange = null) => {
    await downloadTicketReport(
      format,
      customDateRange || timeRange,
      {
        componentId: selectedComponent !== "all" ? selectedComponent : undefined,
        clientId: selectedClient !== "all" ? selectedClient : undefined,
        locationId: selectedLocation !== "all" ? selectedLocation : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      },
      showToast
    );
  };

  // Fetch summary data from backend
  const fetchSummary = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const res = await api.get("/summary", {
        params: {
          timeRange,
          componentId: selectedComponent !== "all" ? selectedComponent : undefined,
          clientId: selectedClient !== "all" ? selectedClient : undefined,
          locationId: selectedLocation !== "all" ? selectedLocation : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
        },
      });
      setData(res.data?.data || null);
    } catch (err) {
      console.error("Gagal memuat ringkasan dashboard:", err);
      if (!isBackground) setError(err.response?.data?.message || "Gagal memuat data ringkasan");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [timeRange, selectedComponent, selectedClient, selectedLocation, selectedStatus]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Real-time updates via SSE when tickets change
  useEffect(() => {
    if (!accessToken) return;
    const sseUrl = `${API_BASE_URL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(sseUrl);

    const handleTicketChange = () => {
      fetchSummary(true);
    };

    eventSource.addEventListener("ticket_created", handleTicketChange);
    eventSource.addEventListener("ticket_updated", handleTicketChange);

    return () => {
      eventSource.close();
    };
  }, [accessToken, fetchSummary]);

  const kpis = data?.kpis || {
    totalTickets: 0,
    vsPrevPeriodText: "vs periode lalu",
    openTickets: 0,
    monitorTickets: 0,
    completedTickets: 0,
    completionRate: 0,
    mttrDays: "0.0",
    affectedUnits: 0,
    totalUnits: 0,
  };

  const monthlyTrend = useMemo(() => data?.charts?.monthlyTrend || [], [data]);
  const statusDistribution = useMemo(() => data?.charts?.statusDistribution || [], [data]);
  const topFailureCodes = useMemo(() => data?.rankings?.topFailureCodes || [], [data]);
  const topUnits = useMemo(() => data?.rankings?.topUnits || [], [data]);
  const filterOptions = data?.filterOptions || {
    components: [],
    clients: [],
    locations: [],
    statuses: [],
  };

  // ECharts Options: Tren tiket per bulan (Area / Line Chart)
  const trendChartOption = useMemo(() => {
    const months = monthlyTrend.map((m) => m.month);
    const counts = monthlyTrend.map((m) => m.count);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0f172a",
        borderColor: "#0f172a",
        textStyle: { color: "#ffffff", fontSize: 12, fontWeight: 600 },
        formatter: (params) => {
          if (!params || !params[0]) return "";
          const p = params[0];
          return `${p.name}: <b>${p.value}</b> tiket`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        top: "14%",
        bottom: "6%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#64748b",
          fontSize: 11.5,
          fontWeight: 500,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: { color: "#f1f5f9", width: 1.2 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
        },
      },
      series: [
        {
          name: "Jumlah Tiket",
          type: "line",
          smooth: true,
          data: counts,
          symbol: "circle",
          symbolSize: 7,
          showSymbol: true,
          itemStyle: {
            color: "#0e8587",
            borderColor: "#ffffff",
            borderWidth: 2.5,
          },
          lineStyle: {
            color: "#0e8587",
            width: 2.8,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(14, 133, 135, 0.22)" },
                { offset: 1, color: "rgba(14, 133, 135, 0.0)" },
              ],
            },
          },
        },
      ],
    };
  }, [monthlyTrend]);

  // ECharts Options: Distribusi status (Donut Chart)
  const statusChartOption = useMemo(() => {
    const pieData = statusDistribution.map((item) => ({
      value: item.count,
      name: item.status,
      itemStyle: { color: item.color },
    }));

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "#0f172a",
        borderColor: "#0f172a",
        textStyle: { color: "#ffffff", fontSize: 12, fontWeight: 600 },
        formatter: (params) => {
          return `<b>${params.name}</b><br/>Jumlah: <b>${params.value}</b> tiket (${params.percent}%)`;
        },
      },
      series: [
        {
          name: "Distribusi Status",
          type: "pie",
          radius: ["62%", "88%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 3,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 4,
            label: { show: false },
          },
          data: pieData,
        },
      ],
    };
  }, [statusDistribution]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 1. Filter Section (Separated Time Filter and Dropdown Filter Boxes) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* Box 1: Time Range Filter with its own padding */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "8px 16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            flexWrap: "wrap",
          }}
        >
          {/* Filter Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "4px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span style={{ fontSize: "13.5px", fontWeight: 650, color: "#1e293b" }}>Filter</span>
          </div>

          {/* Quick Time Range Pills */}
          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
            {TIME_RANGES.map((item) => {
              const isActive = timeRange === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTimeRange(item.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: isActive ? "#10212a" : "#e2e8f0",
                    backgroundColor: isActive ? "#10212a" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                    outline: "none",
                    transform: "none",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Box 2: Dropdown Filters with its own separated padding */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "12px 18px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Component */}
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              minWidth: "150px",
            }}
          >
            <option value="all">Semua component</option>
            {filterOptions.components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Client */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              minWidth: "140px",
            }}
          >
            <option value="all">Semua client</option>
            {filterOptions.clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>

          {/* Location */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              minWidth: "130px",
            }}
          >
            <option value="all">Semua lokasi</option>
            {filterOptions.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
              minWidth: "130px",
            }}
          >
            <option value="all">Semua status</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="solved">Solved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Reset Filter Button if active (dropdowns only) */}
          {(selectedComponent !== "all" ||
            selectedClient !== "all" ||
            selectedLocation !== "all" ||
            selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedComponent("all");
                setSelectedClient("all");
                setSelectedLocation("all");
                setSelectedStatus("all");
              }}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#f1f5f9",
                color: "#0e8587",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "background-color 0.15s ease",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset filter
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            borderRadius: "10px",
            color: "#dc2626",
            fontSize: "13.5px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* 2. 6 KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Card 1: Total Tiket */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#0e8587",
            }}
          />
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            Total tiket
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.totalTickets}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            {kpis.vsPrevPeriodText}
          </div>
        </div>

        {/* Card 2: Open */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#dc2626",
            }}
          />
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            Open
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.openTickets}
          </div>
          <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: 500, marginTop: "8px" }}>
            perlu tindakan
          </div>
        </div>

        {/* Card 3: Escalated */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#f59e0b",
            }}
          />
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            Escalated
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.monitorTickets}
          </div>
          <div style={{ fontSize: "12px", color: "#d97706", fontWeight: 500, marginTop: "8px" }}>
            dalam pemantauan
          </div>
        </div>

        {/* Card 4: Selesai */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#10b981",
            }}
          />
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            Selesai
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.completionRate}{" "}
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#475569" }}>%</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            {kpis.completedTickets} solved/closed
          </div>
        </div>

        {/* Card 5: MTTR */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            MTTR
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.mttrDays}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text-muted)" }}>hari</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            rata-rata penyelesaian
          </div>
        </div>

        {/* Card 6: Unit Terdampak */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 22px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
            Unit terdampak
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {loading ? "..." : kpis.affectedUnits}
            <span style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text-muted)" }}>
              {" "}
              /{kpis.totalUnits}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            dari unit beroperasi
          </div>
        </div>
      </div>

      {/* 3. Charts Section (2 Columns) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Left Chart: Tren tiket per bulan */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Tren tiket per bulan
            </h3>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
              {kpis.totalTickets} tiket
            </span>
          </div>

          {/* ECharts Line Chart */}
          <div style={{ position: "relative", width: "100%", height: "180px" }}>
            <ReactECharts
              option={trendChartOption}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>

        {/* Right Chart: Distribusi status */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Distribusi status
            </h3>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              flexWrap: "wrap",
              gap: "20px",
              height: "180px",
            }}
          >
            {/* ECharts Donut Chart */}
            <div style={{ position: "relative", width: "140px", height: "140px" }}>
              <ReactECharts
                option={statusChartOption}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Legend List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "150px" }}>
              {statusDistribution.map((item) => (
                <div
                  key={item.status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        backgroundColor: item.color,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: "#334155", fontWeight: 500 }}>{item.status}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rankings Section (2 Columns) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Left: 5 failure code teratas */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              5 failure code teratas
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {topFailureCodes.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                Tidak ada data kerusakan pada periode ini.
              </div>
            ) : (
              topFailureCodes.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: idx < topFailureCodes.length - 1 ? "1px solid #f8fafc" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#0e8587",
                        minWidth: "75px",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {item.code}
                    </span>
                    <span style={{ fontSize: "13px", color: "#334155" }}>
                      {item.description}
                    </span>
                  </div>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Unit paling bermasalah */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Unit paling bermasalah
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topUnits.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                Tidak ada unit bermasalah pada periode ini.
              </div>
            ) : (
              topUnits.map((item, idx) => (
                <div key={idx}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.unitCode}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                      {item.count}
                    </span>
                  </div>
                  {/* Amber Progress Bar */}
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "9999px",
                      backgroundColor: "#f1f5f9",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${item.percentage}%`,
                        backgroundColor: "#d97706",
                        borderRadius: "9999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
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

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalTickets={data?.kpi?.totalTiket || 0}
        onExport={handleExportDownload}
      />
    </div>
  );
}
