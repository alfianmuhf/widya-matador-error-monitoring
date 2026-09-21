import api from "./api.js";

/**
 * Standardized utility to export and download ticket reports (Excel & PDF).
 * Shared across Ringkasan, Analitik Error, and Daftar Tiket.
 *
 * @param {string} format - "excel" | "xlsx" | "pdf"
 * @param {string|null} dateRange - "30hari" | "90hari" | "6bulan" | "semua" (or "30d" | "90d" | "6m" | "all")
 * @param {object} extraFilters - optional additional filters (e.g. status, componentId, clientId, locationId, search)
 * @param {function|null} onToast - optional callback function for toast status notifications
 */
export async function downloadTicketReport(
  format = "excel",
  dateRange = "6bulan",
  extraFilters = {},
  onToast = null
) {
  try {
    const isPdf = String(format || "").toLowerCase().includes("pdf");
    const ext = isPdf ? "pdf" : "xlsx";
    const endpoint = isPdf ? "/tickets/export/pdf" : "/tickets/export/excel";

    if (onToast) onToast(`Menyiapkan file ${ext.toUpperCase()} dari server...`);

    const params = {};

    // 1. Pass optional relational & status filters if set
    if (extraFilters.search) params.search = extraFilters.search;
    if (extraFilters.status && extraFilters.status !== "all") {
      params.status = extraFilters.status.toLowerCase();
    }
    if (extraFilters.componentId && extraFilters.componentId !== "all") {
      params.componentId = extraFilters.componentId;
    }
    if (extraFilters.clientId && extraFilters.clientId !== "all") {
      params.clientId = extraFilters.clientId;
    }
    if (extraFilters.locationId && extraFilters.locationId !== "all") {
      params.locationId = extraFilters.locationId;
    }

    // 2. Handle date range filtering
    const range = String(dateRange || "").toLowerCase();
    const now = new Date();
    if (range === "30hari" || range === "30d") {
      params.startDate = new Date(now.getTime() - 30 * 24 * 3600000).toISOString();
    } else if (range === "90hari" || range === "90d") {
      params.startDate = new Date(now.getTime() - 90 * 24 * 3600000).toISOString();
    } else if (range === "6bulan" || range === "6m") {
      params.startDate = new Date(now.getTime() - 180 * 24 * 3600000).toISOString();
    }
    // "semua" / "all" leaves startDate undefined to fetch all records

    // 3. Fetch binary stream from API
    const res = await api.get(endpoint, {
      params,
      responseType: "blob",
    });

    // 4. Create and trigger download in browser
    const blob = new Blob([res.data], {
      type: isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    link.setAttribute("download", `laporan-tiket-erad-${dateStr}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onToast) onToast(`Laporan ${ext.toUpperCase()} berhasil diunduh!`);
  } catch (err) {
    console.error("Export ticket report failed:", err);
    if (onToast) onToast("Gagal mengunduh dokumen laporan.");
    throw err;
  }
}
