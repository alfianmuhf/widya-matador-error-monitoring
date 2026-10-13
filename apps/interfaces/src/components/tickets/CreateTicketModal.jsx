import { useState, useEffect, useMemo } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CreateTicketModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;

  const [assets, setAssets] = useState([]);
  const [components, setComponents] = useState([]);
  const [failureCodes, setFailureCodes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form inputs
  const [unitCode, setUnitCode] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [failureCodeId, setFailureCodeId] = useState("");
  const [severity, setSeverity] = useState("rendah");
  const [damageDescription, setDamageDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [rootCause, setRootCause] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setUnitCode("");
    setSelectedComponentId("");
    setFailureCodeId("");
    setSeverity("rendah");
    setDamageDescription("");
    setActionTaken("");
    setRootCause("");
    setErrorMessage(null);

    setLoadingData(true);
    Promise.all([
      api.get("/assets?limit=100&isActive=true").catch(() => ({ data: { data: { assets: [] } } })),
      api.get("/components?limit=100&isActive=true").catch(() => ({ data: { data: { components: [] } } })),
      api.get("/failure-codes?limit=100&isActive=true").catch(() => ({ data: { data: { failureCodes: [] } } })),
    ])
      .then(([assetRes, compRes, fcRes]) => {
        setAssets(assetRes.data?.data?.assets || []);
        setComponents(compRes.data?.data?.components || []);
        setFailureCodes(fcRes.data?.data?.failureCodes || []);
      })
      .catch((err) => {
        console.error("Gagal memuat master data tiket:", err);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen]);

  // Filter failure codes based on selected component
  const filteredFailureCodes = useMemo(() => {
    if (!selectedComponentId) return failureCodes;
    return failureCodes.filter(
      (fc) => fc.component_id === selectedComponentId || fc.componentId === selectedComponentId
    );
  }, [failureCodes, selectedComponentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!unitCode) {
      setErrorMessage("Silakan pilih unit Load Scanner.");
      return;
    }
    if (!failureCodeId) {
      setErrorMessage("Silakan pilih kode error / failure code.");
      return;
    }
    if (!damageDescription.trim()) {
      setErrorMessage("Deskripsi gejala kerusakan wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        unitCode,
        failureCodeId,
        componentId: selectedComponentId || undefined,
        severity,
        damageDescription: damageDescription.trim(),
        actionTaken: actionTaken.trim() || undefined,
        rootCause: rootCause.trim() || undefined,
        status: "open",
      };

      const res = await api.post("/tickets", payload);
      const created = res.data?.data;

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      console.error("Gagal membuat tiket:", err);
      const msg =
        err.response?.data?.details?.[0]?.message ||
        err.response?.data?.message ||
        "Gagal membuat tiket baru.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#e8f7f6",
                color: "#0e8587",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              ➕
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 750, color: "var(--text-dark)" }}>
                Tambah Tiket Baru
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                Khusus Divisi Aftersales · Pembuat tiket otomatis menjadi penanggung jawab Open
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: "8px",
              borderRadius: "8px",
              color: "#64748b",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* UNIT CODE & CLIENT */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Unit Load Scanner <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              disabled={loadingData || submitting}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#f8fafc",
                outline: "none",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              <option value="">-- Pilih Unit Load Scanner --</option>
              {assets.map((a) => (
                <option key={a.id || a.unit_code} value={a.unit_code}>
                  {a.unit_code} - {a.client?.name || "Client"} ({a.location?.name || "Lokasi"})
                </option>
              ))}
            </select>
          </div>

          {/* COMPONENT & FAILURE CODE (2 COLUMNS) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Komponen
              </label>
              <select
                value={selectedComponentId}
                onChange={(e) => {
                  setSelectedComponentId(e.target.value);
                  setFailureCodeId("");
                }}
                disabled={loadingData || submitting}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13px",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Semua Komponen --</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Kode Error / Failure Code <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={failureCodeId}
                onChange={(e) => setFailureCodeId(e.target.value)}
                disabled={loadingData || submitting}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13px",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Pilih Failure Code --</option>
                {filteredFailureCodes.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.code} - {fc.component?.name || "Komponen"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SEVERITY LEVEL */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
              Tingkat Keparahan (Severity) <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {[
                { val: "rendah", label: "Rendah", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                { val: "sedang", label: "Sedang", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                { val: "tinggi", label: "Tinggi", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
              ].map((s) => {
                const isSelected = severity === s.val;
                return (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setSeverity(s.val)}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: isSelected ? `2px solid ${s.color}` : "1.5px solid #e2e8f0",
                      backgroundColor: isSelected ? s.bg : "#ffffff",
                      color: isSelected ? s.color : "#64748b",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{isSelected ? "●" : "○"}</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DAMAGE DESCRIPTION */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Gejala / Deskripsi Kerusakan <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              placeholder="Contoh: Unit load scanner offline, data lidar tidak terbaca oleh sistem..."
              required
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#f8fafc",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* ACTION TAKEN */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Tindakan Awal yang Telah Dilakukan (Opsional)
            </label>
            <textarea
              rows={2}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Contoh: Pengecekan koneksi power supply dan kabel LAN..."
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#f8fafc",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 650,
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting || loadingData}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                backgroundColor: "#0e8587",
                color: "#ffffff",
                cursor: submitting || loadingData ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(14, 133, 135, 0.25)",
              }}
            >
              {submitting ? "Membuat Tiket..." : "Buat Tiket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
