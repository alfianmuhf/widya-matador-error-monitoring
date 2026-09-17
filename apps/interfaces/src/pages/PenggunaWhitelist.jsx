import { useState, useEffect, useCallback } from "react";
import UserTable from "../components/users/UserTable.jsx";
import UserModal from "../components/users/UserModal.jsx";
import TelegramTable from "../components/users/TelegramTable.jsx";
import TelegramModal from "../components/users/TelegramModal.jsx";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal.jsx";
import api from "../lib/api.js";

export default function PenggunaWhitelist() {
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
      {/* Tab Switcher Pills */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: activeTab === "users" ? "none" : "1px solid var(--tab-inactive-border)",
              backgroundColor: activeTab === "users" ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
              color: activeTab === "users" ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "users" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Pengguna Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("telegram")}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: activeTab === "telegram" ? "none" : "1px solid var(--tab-inactive-border)",
              backgroundColor: activeTab === "telegram" ? "var(--tab-active-bg)" : "var(--tab-inactive-bg)",
              color: activeTab === "telegram" ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "telegram" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Whitelist Telegram
          </button>
        </div>

        {/* Tab Content Cards */}
        {activeTab === "users" ? (
          <UserTable
            users={users}
            loading={loadingUsers}
            onAddUser={handleOpenAddUser}
            onEditUser={handleOpenEditUser}
            onDeleteUser={handleOpenDeleteUser}
          />
        ) : (
          <TelegramTable
            telegramUsers={telegramUsers}
            loading={loadingTelegram}
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
        description="Apakah Anda yakin ingin menghapus akun pengguna ini? Seluruh sesi login dan token terkait akan dicabut permanen."
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
        description="Apakah Anda yakin ingin menghapus pengguna Telegram ini dari whitelist? Pengguna tidak akan dapat mengakses bot lagi."
        loading={deleteTelegramLoading}
        error={deleteTelegramError}
      />
    </div>
  );
}

