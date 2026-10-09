import { useState, useEffect, useCallback } from "react";
import ClientTable from "../components/master-data/ClientTable.jsx";
import LocationTable from "../components/master-data/LocationTable.jsx";
import ComponentTable from "../components/master-data/ComponentTable.jsx";
import FailureCodeTable from "../components/master-data/FailureCodeTable.jsx";
import AssetTable from "../components/master-data/AssetTable.jsx";
import MasterDataModal from "../components/master-data/MasterDataModal.jsx";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal.jsx";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [
  { id: "asset", label: "Unit Load Scanner" },
  { id: "client", label: "Client" },
  { id: "location", label: "Lokasi" },
  { id: "component", label: "Component" },
  { id: "failureCode", label: "Failure Code" },
];

const renderTabIcon = (id, isActive) => {
  const iconColor = isActive ? "#ffffff" : "#64748b";
  switch (id) {
    case "asset":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      );
    case "client":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01" />
          <path d="M16 6h.01" />
          <path d="M12 6h.01" />
          <path d="M12 10h.01" />
          <path d="M12 14h.01" />
          <path d="M16 10h.01" />
          <path d="M16 14h.01" />
          <path d="M8 10h.01" />
          <path d="M8 14h.01" />
        </svg>
      );
    case "location":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "component":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case "failureCode":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return null;
  }
};

export default function MasterData() {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const canManage = userRole === "admin" || userRole === "coordinator";

  const [activeTab, setActiveTab] = useState("asset");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all" | "true" | "false"

  // Data State
  const [dataList, setDataList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Relational options for dropdowns in modal
  const [allClients, setAllClients] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [allComponents, setAllComponents] = useState([]);

  // Form Modal State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch dropdown options for relations
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const [cRes, lRes, compRes] = await Promise.all([
        api.get("/clients?limit=100&isActive=true").catch(() => ({ data: { data: { clients: [] } } })),
        api.get("/locations?limit=100&isActive=true").catch(() => ({ data: { data: { locations: [] } } })),
        api.get("/components?limit=100&isActive=true").catch(() => ({ data: { data: { components: [] } } })),
      ]);
      setAllClients(cRes.data?.data?.clients || []);
      setAllLocations(lRes.data?.data?.locations || []);
      setAllComponents(compRes.data?.data?.components || []);
    } catch (e) {
      console.error("Gagal mengambil opsi relasi:", e);
    }
  }, []);

  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  // Fetch data for active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "";
      if (activeTab === "client") endpoint = "/clients";
      else if (activeTab === "location") endpoint = "/locations";
      else if (activeTab === "component") endpoint = "/components";
      else if (activeTab === "failureCode") endpoint = "/failure-codes";
      else if (activeTab === "asset") endpoint = "/assets";

      const params = new URLSearchParams();
      params.append("limit", "50");
      if (searchTerm) params.append("search", searchTerm);
      if (filterActive !== "all") params.append("isActive", filterActive);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      const data = res.data?.data || {};

      if (activeTab === "client") {
        setDataList(data.clients || []);
        setTotalCount(data.meta?.total || (data.clients || []).length);
      } else if (activeTab === "location") {
        setDataList(data.locations || []);
        setTotalCount(data.meta?.total || (data.locations || []).length);
      } else if (activeTab === "component") {
        setDataList(data.components || []);
        setTotalCount(data.meta?.total || (data.components || []).length);
      } else if (activeTab === "failureCode") {
        setDataList(data.failureCodes || []);
        setTotalCount(data.meta?.total || (data.failureCodes || []).length);
      } else if (activeTab === "asset") {
        setDataList(data.assets || []);
        setTotalCount(data.meta?.total || (data.assets || []).length);
      }
    } catch (err) {
      console.error("Gagal mengambil data master:", err);
      setDataList([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, filterActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers for Create / Edit
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setIsFormModalOpen(true);
  };

  // Handlers for Delete
  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      let endpoint = "";
      if (activeTab === "client") endpoint = "/clients";
      else if (activeTab === "location") endpoint = "/locations";
      else if (activeTab === "component") endpoint = "/components";
      else if (activeTab === "failureCode") endpoint = "/failure-codes";
      else if (activeTab === "asset") endpoint = "/assets";

      await api.delete(`${endpoint}/${itemToDelete.id}`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
      fetchDropdownOptions();
    } catch (err) {
      console.error("Gagal menghapus item:", err);
      setDeleteError(err.response?.data?.message || "Gagal menghapus data master");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper for Create button label
  const getCreateButtonLabel = () => {
    switch (activeTab) {
      case "client":
        return "Tambah Client";
      case "location":
        return "Tambah Lokasi";
      case "component":
        return "Tambah Komponen";
      case "failureCode":
        return "Tambah Failure Code";
      case "asset":
        return "Tambah Unit Load Scanner";
      default:
        return "Tambah Data";
    }
  };

  const getItemDeleteName = () => {
    if (!itemToDelete) return "";
    if (activeTab === "client" || activeTab === "location" || activeTab === "component") {
      return itemToDelete.name || "";
    }
    if (activeTab === "failureCode") {
      return `${itemToDelete.code} ${itemToDelete.description ? "— " + itemToDelete.description : ""}`;
    }
    if (activeTab === "asset") {
      return `${itemToDelete.unitCode} (${itemToDelete.client?.name || ""})`;
    }
    return "";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 1. Tab Switcher Navigation Bar (Di Bawah Header) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid",
                borderColor: isActive ? "#11222c" : "#e2e8f0",
                backgroundColor: isActive ? "#11222c" : "#ffffff",
                color: isActive ? "#ffffff" : "#334155",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)",
                whiteSpace: "nowrap",
                outline: "none",
                transform: "none",
              }}
            >
              {renderTabIcon(tab.id, isActive)}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Main Card Container */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          padding: "24px 28px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Card Header & Unified Action Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          {/* Left: Title & Count */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary-teal)",
                backgroundColor: "var(--primary-teal-light)",
                padding: "2px 8px",
                borderRadius: "9999px",
              }}
            >
              {totalCount} Total
            </span>
          </div>

          {/* Right: Search, Filter, & Single Contextual Create Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "8px 12px 8px 34px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  width: "180px",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary-teal)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-light)")}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Filter Status */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "var(--text-sm)",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-dark)",
                cursor: "pointer",
              }}
            >
              <option value="all">Semua Status</option>
              <option value="true">active</option>
              <option value="false">non active</option>
            </select>

            {/* 1 Tombol Create Dinamis — Khusus ADMIN & COORDINATOR */}
            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "var(--primary-teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  outline: "none",
                  transform: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-teal)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{getCreateButtonLabel()}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Table Views */}
        {activeTab === "client" && (
          <ClientTable
            clients={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            canManage={canManage}
          />
        )}

        {activeTab === "location" && (
          <LocationTable
            locations={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            canManage={canManage}
          />
        )}

        {activeTab === "component" && (
          <ComponentTable
            components={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            canManage={canManage}
          />
        )}

        {activeTab === "failureCode" && (
          <FailureCodeTable
            failureCodes={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            canManage={canManage}
          />
        )}

        {activeTab === "asset" && (
          <AssetTable
            assets={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            canManage={canManage}
          />
        )}
      </div>

      {/* 4. Form Modal Popup (Create / Edit) */}
      <MasterDataModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        entityType={activeTab}
        item={selectedItem}
        onSuccess={() => {
          fetchData();
          fetchDropdownOptions();
        }}
        extraOptions={{
          clients: allClients,
          locations: allLocations,
          components: allComponents,
        }}
      />

      {/* 5. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteLoading) setIsDeleteModalOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        title={`Hapus Data ${TABS.find((t) => t.id === activeTab)?.label}`}
        itemName={getItemDeleteName()}
        description="Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan jika syarat relasi terpenuhi."
        loading={deleteLoading}
        error={deleteError}
      />
    </div>
  );
}
