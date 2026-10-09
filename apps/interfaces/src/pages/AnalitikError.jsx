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

export default function AnalitikError() {
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

  // Fetch Error Analytics Data from Backend
  const fetchAnalytics = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const res = await api.get("/error-analytics", {
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
      console.error("Gagal memuat data analitik error:", err);
      if (!isBackground) {
        setError(err.response?.data?.message || "Gagal memuat data analitik error");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [timeRange, selectedComponent, selectedClient, selectedLocation, selectedStatus]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (!accessToken) return;
    const sseUrl = `${API_BASE_URL}/tickets/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(sseUrl);

    const handleTicketChange = () => {
      fetchAnalytics(true);
    };

    eventSource.addEventListener("ticket_created", handleTicketChange);
    eventSource.addEventListener("ticket_updated", handleTicketChange);

    return () => {
      eventSource.close();
    };
  }, [accessToken, fetchAnalytics]);

  // Listen to header "Export laporan" button event
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
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        componentId: selectedComponent !== "all" ? selectedComponent : undefined,
        clientId: selectedClient !== "all" ? selectedClient : undefined,
        locationId: selectedLocation !== "all" ? selectedLocation : undefined,
      },
      showToast
    );
  };

  // Datasets from backend
  const ticketsPerComponent = useMemo(() => data?.ticketsPerComponent || [], [data]);
  const paretoFailureCode = useMemo(() => data?.paretoFailureCode || [], [data]);
  const sebaranPerClient = useMemo(() => data?.sebaranPerClient || [], [data]);
  const heatmap = useMemo(
    () =>
      data?.heatmap || {
        units: [],
        components: [],
        data: [],
      },
    [data]
  );
  const filterOptions = data?.filterOptions || {
    components: [],
    clients: [],
    locations: [],
    statuses: [],
  };

  // --- ECharts Options ---

  // 1. Chart 1: Tiket per component (Horizontal Bar)
  const chart1Option = useMemo(() => {
    const categories = ticketsPerComponent.map((c) => c.name);
    const counts = ticketsPerComponent.map((c) => ({
      value: c.count,
      componentId: c.componentId,
      name: c.name,
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          if (!params || !params[0]) return "";
          const p = params[0];
          return `<b>${p.name}</b><br/>Jumlah Tiket: <b>${p.value}</b>`;
        },
      },
      grid: {
        left: "4%",
        right: "10%",
        top: "4%",
        bottom: "4%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        splitLine: {
          lineStyle: { color: "#f1f5f9", type: "dashed" },
        },
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#334155",
          fontSize: 12,
          fontWeight: 500,
        },
      },
      series: [
        {
          name: "Jumlah Tiket",
          type: "bar",
          data: counts,
          barWidth: 14,
          itemStyle: {
            color: "#0e8587",
            borderRadius: [0, 5, 5, 0],
          },
          label: {
            show: true,
            position: "right",
            color: "#475569",
            fontWeight: 600,
            fontSize: 12,
            distance: 8,
          },
        },
      ],
    };
  }, [ticketsPerComponent]);

  // Click on component bar -> Filter by that component
  const onChart1Events = useMemo(
    () => ({
      click: (params) => {
        if (params.data?.componentId) {
          setSelectedComponent((prev) =>
            prev === params.data.componentId ? "all" : params.data.componentId
          );
        } else if (params.name) {
          const match = filterOptions.components.find((c) => c.name === params.name);
          if (match) {
            setSelectedComponent((prev) => (prev === match.id ? "all" : match.id));
          }
        }
      },
    }),
    [filterOptions.components]
  );

  // 2. Chart 2: Pareto failure code (Bar + Line Dual Axis)
  const chart2Option = useMemo(() => {
    const codes = paretoFailureCode.map((f) => f.code);
    const barData = paretoFailureCode.map((f) => f.count);
    const lineData = paretoFailureCode.map((f) => f.cumulativePercent);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter: (params) => {
          if (!params || !params.length) return "";
          const code = params[0].name;
          const found = paretoFailureCode.find((f) => f.code === code);
          const desc = found?.description ? `<br/><span style="font-size:11px;color:#94a3b8">${found.description}</span>` : "";
          let text = `<b>${code}</b>${desc}<br/>`;
          params.forEach((p) => {
            if (p.seriesType === "bar") {
              text += `Jumlah: <b>${p.value}</b> tiket<br/>`;
            } else {
              text += `Kumulatif: <b>${p.value}%</b>`;
            }
          });
          return text;
        },
      },
      grid: {
        left: "4%",
        right: "8%",
        top: "10%",
        bottom: "16%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: codes,
        axisLabel: {
          rotate: 45,
          fontSize: 11,
          color: "#64748b",
          interval: 0,
        },
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: [
        {
          type: "value",
          name: "",
          position: "left",
          splitLine: { lineStyle: { color: "#f1f5f9" } },
          axisLabel: { color: "#64748b", fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        {
          type: "value",
          name: "",
          min: 0,
          max: 100,
          position: "right",
          splitLine: { show: false },
          axisLabel: {
            formatter: "{value}%",
            color: "#64748b",
            fontSize: 11,
          },
          axisLine: { show: false },
          axisTick: { show: false },
        },
      ],
      series: [
        {
          name: "Jumlah",
          type: "bar",
          yAxisIndex: 0,
          data: barData,
          barWidth: 16,
          itemStyle: {
            color: "#0e8587",
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: "Kumulatif %",
          type: "line",
          yAxisIndex: 1,
          data: lineData,
          itemStyle: {
            color: "#d97706",
          },
          lineStyle: {
            width: 2.5,
            color: "#d97706",
          },
          symbol: "circle",
          symbolSize: 7,
          showSymbol: true,
        },
      ],
    };
  }, [paretoFailureCode]);

  // 3. Chart 3: Sebaran per client (top 8)
  const chart3Option = useMemo(() => {
    const names = sebaranPerClient.map((c) => c.clientName);
    const counts = sebaranPerClient.map((c) => c.count);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          if (!params || !params[0]) return "";
          const p = params[0];
          return `<b>${p.name}</b><br/>Jumlah Tiket: <b>${p.value}</b>`;
        },
      },
      grid: {
        left: "4%",
        right: "12%",
        top: "6%",
        bottom: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f1f5f9" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      yAxis: {
        type: "category",
        inverse: true, // #1 rank at top
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#334155",
          fontSize: 12,
          fontWeight: 500,
        },
      },
      series: [
        {
          name: "Tiket",
          type: "bar",
          data: counts,
          barWidth: 16,
          itemStyle: {
            color: "#182a38",
            borderRadius: [0, 5, 5, 0],
          },
          label: {
            show: true,
            position: "right",
            color: "#1e293b",
            fontWeight: 600,
            fontSize: 12,
            distance: 8,
          },
        },
      ],
    };
  }, [sebaranPerClient]);

  // 4. Chart 4: Peta panas unit × component
  const chart4Option = useMemo(() => {
    return {
      tooltip: {
        position: "top",
        formatter: (params) => {
          if (!params.value) return "";
          const [colIdx, rowIdx, val] = params.value;
          const comp = heatmap.components[colIdx] || "";
          const unit = heatmap.units[rowIdx] || "";
          return `Unit: <b>${unit}</b><br/>Komponen: <b>${comp}</b><br/>Error: <b>${val} tiket</b>`;
        },
      },
      grid: {
        left: "3%",
        right: "5%",
        top: 60,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: heatmap.components,
        position: "top",
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#475569",
          fontSize: 11,
          fontWeight: 600,
          interval: 0,
          align: "center",
          verticalAlign: "bottom",
          margin: 10,
          lineHeight: 14,
          formatter: (val) => {
            if (!val) return "";
            const cleanMap = {
              "Mini PC & OS": "Mini\nPC",
              "Lidar Scanner Sensor": "Lidar &\nController",
              "Power Supply & Battery": "Accu &\nPower",
              "Network Gateway & Router": "Network",
              "Optical CCTV Camera": "CCTV",
              "Optical Camera": "Camera",
            };
            if (cleanMap[val]) return cleanMap[val];

            const words = val.split(/\s+/);
            if (words.length === 1) return val;
            const lines = [];
            let current = "";
            for (const w of words) {
              if (!current) {
                current = w;
              } else if ((current + " " + w).length <= 9) {
                current += " " + w;
              } else {
                lines.push(current);
                current = w;
              }
            }
            if (current) lines.push(current);
            return lines.join("\n");
          },
        },
      },
      yAxis: {
        type: "category",
        data: heatmap.units,
        inverse: true,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#334155",
          fontSize: 11,
          fontWeight: 600,
          margin: 12,
        },
      },
      visualMap: {
        type: "piecewise",
        show: false,
        dimension: 2,
        pieces: [
          { value: 0, color: "#f1f5f9" },
          { value: 1, color: "#dfb36c" },
          { gte: 2, color: "#c27803" },
        ],
        outOfRange: {
          color: "#f1f5f9",
        },
      },
      series: [
        {
          name: "Unit x Component",
          type: "heatmap",
          data: heatmap.data,
          itemStyle: {
            borderRadius: 6,
            borderColor: "#ffffff",
            borderWidth: 4,
          },
          label: {
            show: true,
            formatter: (p) => {
              const val = p.value ? p.value[2] : 0;
              if (!val || val === 0) return "";
              if (val === 1) return `{val1|${val}}`;
              return `{val2|${val}}`;
            },
            rich: {
              val1: {
                color: "#2e1e05",
                fontWeight: 700,
                fontSize: 13,
              },
              val2: {
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 13,
              },
            },
          },
        },
      ],
    };
  }, [heatmap]);

  const isFilterActive =
    selectedComponent !== "all" ||
    selectedClient !== "all" ||
    selectedLocation !== "all" ||
    selectedStatus !== "all";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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

          {/* Reset Filter Button if active */}
          {isFilterActive && (
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

      {/* 2. Charts Grid Row 1: Tiket per component + Pareto failure code */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {/* Card 1: Tiket per component */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Tiket per component
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              klik untuk filter
            </span>
          </div>

          <div style={{ height: "340px", width: "100%" }}>
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Memuat grafik...
              </div>
            ) : ticketsPerComponent.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Tidak ada data tiket untuk filter ini.
              </div>
            ) : (
              <ReactECharts
                option={chart1Option}
                onEvents={onChart1Events}
                style={{ height: "100%", width: "100%" }}
              />
            )}
          </div>
        </div>

        {/* Card 2: Pareto failure code */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Pareto failure code
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              bar = jumlah · garis = kumulatif %
            </span>
          </div>

          <div style={{ height: "340px", width: "100%" }}>
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Memuat grafik...
              </div>
            ) : paretoFailureCode.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Tidak ada data failure code untuk filter ini.
              </div>
            ) : (
              <ReactECharts
                option={chart2Option}
                style={{ height: "100%", width: "100%" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. Charts Grid Row 2: Sebaran per client (top 8) + Peta panas unit x component */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Card 3: Sebaran per client (top 8) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Sebaran per client (top 8)
            </h3>
          </div>

          <div style={{ height: "360px", width: "100%" }}>
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Memuat grafik...
              </div>
            ) : sebaranPerClient.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Tidak ada data client untuk filter ini.
              </div>
            ) : (
              <ReactECharts
                option={chart3Option}
                style={{ height: "100%", width: "100%" }}
              />
            )}
          </div>
        </div>

        {/* Card 4: Peta panas unit x component */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border-light)",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Peta panas unit × component
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              unit tersibuk vs component
            </span>
          </div>

          <div style={{ height: "360px", width: "100%" }}>
            {loading ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Memuat grafik...
              </div>
            ) : heatmap.units.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Tidak ada data unit untuk filter ini.
              </div>
            ) : (
              <ReactECharts
                option={chart4Option}
                style={{ height: "100%", width: "100%" }}
              />
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
        onExport={handleExportDownload}
      />
    </div>
  );
}
