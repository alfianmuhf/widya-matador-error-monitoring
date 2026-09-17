import { useState, useEffect, useCallback } from "react";
import ClientTable from "../components/master-data/ClientTable.jsx";
import LocationTable from "../components/master-data/LocationTable.jsx";
import ComponentTable from "../components/master-data/ComponentTable.jsx";
import FailureCodeTable from "../components/master-data/FailureCodeTable.jsx";
import AssetTable from "../components/master-data/AssetTable.jsx";
import MasterDataModal from "../components/master-data/MasterDataModal.jsx";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal.jsx";
import api from "../lib/api.js";

const TABS = [
  { id: "client", label: "Client", icon: "🏢" },
  { id: "location", label: "Lokasi", icon: "📍" },
  { id: "component", label: "Komponen", icon: "⚙️" },
  { id: "failureCode", label: "Failure Code", icon: "⚠️" },
  { id: "asset", label: "Asset Robot", icon: "🤖" },
];

export default function MasterData() {
  const [activeTab, setActiveTab] = useState("client");

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
        return "Tambah Asset Robot";
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
                padding: "9px 18px",
                borderRadius: "10px",
                border: isActive ? "none" : "1px solid var(--tab-inactive-border)",
                backgroundColor: isActive ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
                color: isActive ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                fontWeight: isActive ? 650 : 500,
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
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
              <option value="true">Hanya Aktif</option>
              <option value="false">Hanya Nonaktif</option>
            </select>

            {/* 1 Tombol Create Dinamis */}
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
          </div>
        </div>

        {/* 3. Table Views */}
        {activeTab === "client" && (
          <ClientTable
            clients={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}

        {activeTab === "location" && (
          <LocationTable
            locations={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}

        {activeTab === "component" && (
          <ComponentTable
            components={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}

        {activeTab === "failureCode" && (
          <FailureCodeTable
            failureCodes={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}

        {activeTab === "asset" && (
          <AssetTable
            assets={dataList}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
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
