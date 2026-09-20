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
  const canManageUsers = currentUser?.role === "ADMIN" || currentUser?.role === "COORDINATOR";

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
            border: "1px solid",
            borderColor: activeTab === "users" ? "#2563EB" : "var(--tab-inactive-border, #CBD5E1)",
            backgroundColor: activeTab === "users" ? "#2563EB" : "#FFFFFF",
            color: activeTab === "users" ? "#FFFFFF" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            boxShadow: "none",
            outline: "none",
            transform: "none",
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
            border: "1px solid",
            borderColor: activeTab === "telegram" ? "#2563EB" : "var(--tab-inactive-border, #CBD5E1)",
            backgroundColor: activeTab === "telegram" ? "#2563EB" : "#FFFFFF",
            color: activeTab === "telegram" ? "#FFFFFF" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            boxShadow: "none",
            outline: "none",
            transform: "none",
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
