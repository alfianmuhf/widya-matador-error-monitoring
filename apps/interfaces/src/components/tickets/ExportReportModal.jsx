import { useState } from "react";

export default function ExportReportModal({ isOpen, onClose, totalTickets = 0, onExport, onDownload }) {
  const [reportFormat, setReportFormat] = useState("excel");
  const [dateRange, setDateRange] = useState("6bulan");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const action = onExport || onDownload;
      if (typeof action === "function") {
        await action(reportFormat, dateRange);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(11, 30, 39, 0.5)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
            Export Laporan Tiket
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "18px", lineHeight: 1.4 }}>
          Ekspor rekapitulasi data tiket aftersales{totalTickets > 0 ? ` (${totalTickets} tiket)` : ""} ke dalam format dokumen yang Anda pilih.
        </p>

        {/* Format Selection */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-dark)", marginBottom: "8px" }}>
            Format Dokumen
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setReportFormat("excel")}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: reportFormat === "excel" ? "2px solid var(--primary-teal)" : "1px solid var(--border-light)",
                backgroundColor: reportFormat === "excel" ? "var(--primary-teal-light)" : "#ffffff",
                color: reportFormat === "excel" ? "var(--primary-teal)" : "var(--text-dark)",
                fontWeight: 650,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="m8 8 8 8" />
                <path d="m16 8-8 8" />
              </svg>
              Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => setReportFormat("pdf")}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: reportFormat === "pdf" ? "2px solid var(--primary-teal)" : "1px solid var(--border-light)",
                backgroundColor: reportFormat === "pdf" ? "var(--primary-teal-light)" : "#ffffff",
                color: reportFormat === "pdf" ? "var(--primary-teal)" : "var(--text-dark)",
                fontWeight: 650,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              PDF Document
            </button>
          </div>
        </div>

        {/* Periode */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-dark)", marginBottom: "8px" }}>
            Periode Data
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              color: "var(--text-dark)",
              outline: "none",
            }}
          >
            <option value="30hari">30 Hari Terakhir</option>
            <option value="90hari">90 Hari Terakhir</option>
            <option value="6bulan">6 Bulan Terakhir</option>
            <option value="semua">Semua Riwayat Tiket</option>
          </select>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "#ffffff",
              color: "var(--text-dark)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 650,
              cursor: isExporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExporting ? "Menyiapkan..." : "Unduh Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}
