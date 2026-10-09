import { useState, useEffect, useCallback } from "react";
import UserTable from "../components/users/UserTable.jsx";
import UserModal from "../components/users/UserModal.jsx";
import TelegramTable from "../components/users/TelegramTable.jsx";
import TelegramModal from "../components/users/TelegramModal.jsx";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";

export default function PenggunaWhitelist() {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const canManageUsers = userRole === "admin";

  const [activeTab, setActiveTab] = useState("users"); // "users" | "telegram"

  // User State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Delete User State
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState(null);

  // Telegram State
  const [telegramUsers, setTelegramUsers] = useState([]);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [selectedTelegramUser, setSelectedTelegramUser] = useState(null);

  // Delete Telegram State
  const [isDeleteTelegramModalOpen, setIsDeleteTelegramModalOpen] = useState(false);
  const [telegramUserToDelete, setTelegramUserToDelete] = useState(null);
  const [deleteTelegramLoading, setDeleteTelegramLoading] = useState(false);
  const [deleteTelegramError, setDeleteTelegramError] = useState(null);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/users?limit=50");
      setUsers(res.data?.data?.users || []);
    } catch (err) {
      console.error("Gagal mengambil data users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch Telegram Users
  const fetchTelegramUsers = useCallback(async () => {
    setLoadingTelegram(true);
    try {
      const res = await api.get("/telegram-users?limit=50");
      setTelegramUsers(res.data?.data?.telegramUsers || []);
    } catch (err) {
      console.error("Gagal mengambil data telegram users:", err);
    } finally {
      setLoadingTelegram(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (activeTab === "users") {
        setLoadingUsers(true);
        try {
          const res = await api.get("/users?limit=50");
          if (!ignore) {
            setUsers(res.data?.data?.users || []);
          }
        } catch (err) {
          console.error("Gagal mengambil data users:", err);
        } finally {
          if (!ignore) {
            setLoadingUsers(false);
          }
        }
      } else {
        setLoadingTelegram(true);
        try {
          const res = await api.get("/telegram-users?limit=50");
          if (!ignore) {
            setTelegramUsers(res.data?.data?.telegramUsers || []);
          }
        } catch (err) {
          console.error("Gagal mengambil data telegram users:", err);
        } finally {
          if (!ignore) {
            setLoadingTelegram(false);
          }
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  // Handlers for User Modal
  const handleOpenAddUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleOpenDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteUserError(null);
    setIsDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteUserLoading(true);
    setDeleteUserError(null);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error("Gagal menghapus user:", err);
      setDeleteUserError(err.response?.data?.message || "Gagal menghapus akun pengguna");
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // Handlers for Telegram Modal
  const handleOpenAddTelegram = () => {
    setSelectedTelegramUser(null);
    setIsTelegramModalOpen(true);
  };

  const handleOpenEditTelegram = (tgUser) => {
    setSelectedTelegramUser(tgUser);
    setIsTelegramModalOpen(true);
  };

  const handleOpenDeleteTelegram = (tgUser) => {
    setTelegramUserToDelete(tgUser);
    setDeleteTelegramError(null);
    setIsDeleteTelegramModalOpen(true);
  };

  const handleConfirmDeleteTelegram = async () => {
    if (!telegramUserToDelete) return;
    setDeleteTelegramLoading(true);
    setDeleteTelegramError(null);
    try {
      await api.delete(`/telegram-users/${telegramUserToDelete.id}`);
      setIsDeleteTelegramModalOpen(false);
      setTelegramUserToDelete(null);
      fetchTelegramUsers();
    } catch (err) {
      console.error("Gagal menghapus telegram user:", err);
      setDeleteTelegramError(err.response?.data?.message || "Gagal menghapus pengguna Telegram dari whitelist");
    } finally {
      setDeleteTelegramLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Tab Switcher Navigation Bar (Matching Master Data style) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid",
            borderColor: activeTab === "users" ? "#11222c" : "#e2e8f0",
            backgroundColor: activeTab === "users" ? "#11222c" : "#ffffff",
            color: activeTab === "users" ? "#ffffff" : "#334155",
            fontWeight: 600,
            fontSize: "13.5px",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            boxShadow: activeTab === "users" ? "0 1px 2px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)",
            whiteSpace: "nowrap",
            outline: "none",
            transform: "none",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === "users" ? "#ffffff" : "#64748b"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Pengguna Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("telegram")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid",
            borderColor: activeTab === "telegram" ? "#11222c" : "#e2e8f0",
            backgroundColor: activeTab === "telegram" ? "#11222c" : "#ffffff",
            color: activeTab === "telegram" ? "#ffffff" : "#334155",
            fontWeight: 600,
            fontSize: "13.5px",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            boxShadow: activeTab === "telegram" ? "0 1px 2px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.02)",
            whiteSpace: "nowrap",
            outline: "none",
            transform: "none",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke={activeTab === "telegram" ? "#ffffff" : "#64748b"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          <span>Whitelist Telegram</span>
        </button>
      </div>

      {/* Tab Content Cards */}
      {activeTab === "users" ? (
        <UserTable
          users={users}
          loading={loadingUsers}
          canManageUsers={canManageUsers}
          onAddUser={handleOpenAddUser}
          onEditUser={handleOpenEditUser}
          onDeleteUser={handleOpenDeleteUser}
        />
      ) : (
        <TelegramTable
          telegramUsers={telegramUsers}
          loading={loadingTelegram}
          canManageUsers={canManageUsers}
          onAddTelegramUser={handleOpenAddTelegram}
          onEditTelegramUser={handleOpenEditTelegram}
          onDeleteTelegramUser={handleOpenDeleteTelegram}
        />
      )}

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        telegramUser={selectedTelegramUser}
        onSuccess={fetchTelegramUsers}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          if (!deleteUserLoading) setIsDeleteUserModalOpen(false);
        }}
        onConfirm={handleConfirmDeleteUser}
        title="Hapus Pengguna Dashboard"
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.email})` : ""}
        description="Apakah Anda yakin ingin menghapus akun pengguna ini? Jika pengguna memiliki riwayat tiket atau aktivitas, sistem akan melakukan Soft Delete (SUSPENDED) untuk menjaga integritas data."
        loading={deleteUserLoading}
        error={deleteUserError}
      />

      {/* Delete Telegram User Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteTelegramModalOpen}
        onClose={() => {
          if (!deleteTelegramLoading) setIsDeleteTelegramModalOpen(false);
        }}
        onConfirm={handleConfirmDeleteTelegram}
        title="Hapus User Telegram dari Whitelist"
        itemName={
          telegramUserToDelete
            ? `${telegramUserToDelete.fullName ? telegramUserToDelete.fullName + " — " : ""}${
                telegramUserToDelete.username ? "@" + telegramUserToDelete.username : "ID: " + telegramUserToDelete.telegramId
              }`
            : ""
        }
        description="Apakah Anda yakin ingin menghapus pengguna Telegram ini dari whitelist? Jika pengguna memiliki riwayat pelaporan tiket, sistem akan melakukan Soft Delete (nonaktifkan)."
        loading={deleteTelegramLoading}
        error={deleteTelegramError}
      />
    </div>
  );
}
