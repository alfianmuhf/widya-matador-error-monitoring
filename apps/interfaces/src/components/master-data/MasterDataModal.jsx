import { useState, useEffect } from "react";
import Modal from "../common/Modal.jsx";
import api from "../../lib/api.js";

export default function MasterDataModal({
  isOpen,
  onClose,
  entityType, // "client" | "location" | "component" | "failureCode" | "asset"
  item, // null for create, object for edit
  onSuccess,
  extraOptions = {}, // { clients: [], locations: [], components: [] }
}) {
  const isEdit = !!item;

  // Form State
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data when modal opens or item changes
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setError(null);
      return;
    }

    if (item) {
      if (entityType === "client" || entityType === "location") {
        setFormData({
          name: item.name || "",
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
      } else if (entityType === "component") {
        setFormData({
          prefix: item.prefix || "",
          name: item.name || "",
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : 0,
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
      } else if (entityType === "failureCode") {
        setFormData({
          componentId: item.componentId || item.component?.id || "",
          code: item.code || "",
          description: item.description || "",
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
      } else if (entityType === "asset") {
        let commDate = "";
        if (item.commissioningDate) {
          try {
            commDate = new Date(item.commissioningDate).toISOString().split("T")[0];
          } catch {
            commDate = item.commissioningDate;
          }
        }
        setFormData({
          unitCode: item.unitCode || "",
          type: item.type || "portable",
          clientId: item.clientId || item.client?.id || "",
          locationId: item.locationId || item.location?.id || "",
          status: item.status || "OPERATIONAL",
          commissioningDate: commDate,
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
      }
    } else {
      // Defaults for Create
      if (entityType === "client" || entityType === "location") {
        setFormData({ name: "", isActive: true });
      } else if (entityType === "component") {
        setFormData({ prefix: "", name: "", sortOrder: 0, isActive: true });
      } else if (entityType === "failureCode") {
        setFormData({
          componentId: extraOptions.components?.[0]?.id || "",
          code: "",
          description: "",
          isActive: true,
        });
      } else if (entityType === "asset") {
        setFormData({
          unitCode: "",
          type: "portable",
          clientId: extraOptions.clients?.[0]?.id || "",
          locationId: extraOptions.locations?.[0]?.id || "",
          status: "OPERATIONAL",
          commissioningDate: new Date().toISOString().split("T")[0],
          isActive: true,
        });
      }
    }
  }, [isOpen, item, entityType, extraOptions]);

  const getEntityTitle = () => {
    switch (entityType) {
      case "client":
        return isEdit ? "Edit Client" : "Tambah Client Baru";
      case "location":
        return isEdit ? "Edit Lokasi" : "Tambah Lokasi Baru";
      case "component":
        return isEdit ? "Edit Komponen" : "Tambah Komponen Baru";
      case "failureCode":
        return isEdit ? "Edit Failure Code" : "Tambah Failure Code Baru";
      case "asset":
        return isEdit ? "Edit Asset Robot" : "Tambah Asset Robot Baru";
      default:
        return "Master Data";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let endpoint = "";
      if (entityType === "client") endpoint = "/clients";
      else if (entityType === "location") endpoint = "/locations";
      else if (entityType === "component") endpoint = "/components";
      else if (entityType === "failureCode") endpoint = "/failure-codes";
      else if (entityType === "asset") endpoint = "/assets";

      if (isEdit) {
        await api.patch(`${endpoint}/${item.id}`, formData);
      } else {
        await api.post(endpoint, formData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan master data:", err);
      const resMsg = err.response?.data?.message;
      const details = err.response?.data?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        setError(details.map((d) => d.message).join(", "));
      } else {
        setError(resMsg || "Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getEntityTitle()} maxWidth="520px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "var(--text-sm)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Client & Location Fields */}
        {(entityType === "client" || entityType === "location") && (
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
              {entityType === "client" ? "Nama Perusahaan / Client *" : "Nama Lokasi / Site *"}
            </label>
            <input
              type="text"
              required
              placeholder={entityType === "client" ? "Contoh: PT Sumber Otomasi" : "Contoh: Warehouse Jakarta"}
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "var(--text-sm)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* 2. Component Fields */}
        {entityType === "component" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Prefix Komponen *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SEN, MOT, BAT"
                value={formData.prefix || ""}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Digunakan sebagai awalan kode failure (misal: SEN-001). Otomatis huruf besar.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Nama Komponen *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Sensor Unit"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Urutan Tombol di Bot Telegram
              </label>
              <input
                type="number"
                value={formData.sortOrder !== undefined ? formData.sortOrder : 0}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </>
        )}

        {/* 3. Failure Code Fields */}
        {entityType === "failureCode" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Komponen Induk *
              </label>
              <select
                required
                value={formData.componentId || ""}
                onChange={(e) => setFormData({ ...formData, componentId: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                <option value="" disabled>
                  -- Pilih Komponen --
                </option>
                {(extraOptions.components || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prefix} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Kode Kerusakan (Failure Code) *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SEN-001 atau 001"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Kode unik pada komponen yang dipilih.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                Deskripsi Kerusakan
              </label>
              <textarea
                rows={3}
                placeholder="Rincian masalah atau solusi awal..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </>
        )}

        {/* 4. Asset Fields */}
        {entityType === "asset" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Unit Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ROBOT-01"
                  value={formData.unitCode || ""}
                  onChange={(e) => setFormData({ ...formData, unitCode: e.target.value.toUpperCase() })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Tipe Robot *
                </label>
                <select
                  required
                  value={formData.type || "portable"}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="portable">Portable</option>
                  <option value="static">Static</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Client Pemilik *
                </label>
                <select
                  required
                  value={formData.clientId || ""}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="" disabled>
                    -- Pilih Client --
                  </option>
                  {(extraOptions.clients || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Lokasi Site *
                </label>
                <select
                  required
                  value={formData.locationId || ""}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="" disabled>
                    -- Pilih Lokasi --
                  </option>
                  {(extraOptions.locations || []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Status Operasional *
                </label>
                <select
                  required
                  value={formData.status || "OPERATIONAL"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "6px" }}>
                  Tanggal Commissioning
                </label>
                <input
                  type="date"
                  value={formData.commissioningDate || ""}
                  onChange={(e) => setFormData({ ...formData, commissioningDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Status Toggle (isActive) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <input
            type="checkbox"
            id="isActiveToggle"
            checked={formData.isActive !== undefined ? formData.isActive : true}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="isActiveToggle" style={{ fontSize: "var(--text-sm)", color: "var(--text-dark)", cursor: "pointer" }}>
            Status Aktif (Data dapat digunakan di sistem)
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Data"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
