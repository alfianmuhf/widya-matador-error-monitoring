import { useState, useEffect, useCallback } from "react";
import Header from "../components/layout/Header.jsx";
import UserTable from "../components/users/UserTable.jsx";
import UserModal from "../components/users/UserModal.jsx";
import TelegramTable from "../components/users/TelegramTable.jsx";
import TelegramModal from "../components/users/TelegramModal.jsx";
import api from "../lib/api.js";

export default function PenggunaWhitelist() {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "telegram"

  // User State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Telegram State
  const [telegramUsers, setTelegramUsers] = useState([]);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [selectedTelegramUser, setSelectedTelegramUser] = useState(null);

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

  // Handlers for Telegram Modal
  const handleOpenAddTelegram = () => {
    setSelectedTelegramUser(null);
    setIsTelegramModalOpen(true);
  };

  const handleOpenEditTelegram = (tgUser) => {
    setSelectedTelegramUser(tgUser);
    setIsTelegramModalOpen(true);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <Header
        title="Pengguna & Whitelist"
        subtitle="Akun dashboard dan pengguna bot Telegram"
      />

      <div style={{ padding: "0 32px 32px 32px" }}>
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
          />
        ) : (
          <TelegramTable
            telegramUsers={telegramUsers}
            loading={loadingTelegram}
            onAddTelegramUser={handleOpenAddTelegram}
            onEditTelegramUser={handleOpenEditTelegram}
          />
        )}
      </div>

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
    </div>
  );
}
