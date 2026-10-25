import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "../components/common/Modal.jsx";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal.jsx";

export default function ManajemenTim() {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";

  // Data States
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const [expandedTeams, setExpandedTeams] = useState(new Set());

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTeamTarget, setEditTeamTarget] = useState(null);
  const [addMemberTarget, setAddMemberTarget] = useState(null);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);

  // Form Submitting states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields for Create / Edit
  const [teamName, setTeamName] = useState("");
  const [leaderUserId, setLeaderUserId] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Form Fields for Add Member
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);

  // Fetch teams from backend
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/teams?limit=100");
      const list = res.data?.data || [];
      setTeams(list);
    } catch (err) {
      console.error("Gagal memuat tim:", err);
      showToast(err.response?.data?.message || "Gagal memuat daftar tim.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users list for assigning leader / members
  const fetchUsers = useCallback(async () => {
    try {
      setFetchingUsers(true);
      const res = await api.get("/users?limit=100");
      const users = res.data?.data?.users || (Array.isArray(res.data?.data) ? res.data?.data : []);
      setUsersList(users);
    } catch (err) {
      console.error("Gagal memuat daftar pengguna:", err);
    } finally {
      setFetchingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, [fetchTeams, fetchUsers]);

  // Toggle accordion expand/collapse
  const toggleExpand = (teamId) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  // Helper check: Is current user the Leader of a given team?
  const isLeaderOfTeam = (team) => {
    if (!currentUser?.id || !team) return false;
    return team.leaderUserId === currentUser.id || team.leader?.id === currentUser.id;
  };

  // Helper check: Can current user manage this team's members? (Admin or this team's Leader)
  const canManageTeamMembers = (team) => {
    if (isAdmin) return true;
    return isLeaderOfTeam(team);
  };

  // Mapping of userId -> { teamId, teamName, isLeader } for all users assigned to ANY team
  const userTeamMembershipMap = useMemo(() => {
    const map = new Map();
    teams.forEach((t) => {
      if (t.leaderUserId) {
        map.set(t.leaderUserId, { teamId: t.id, teamName: t.name, isLeader: true });
      }
      (t.members || []).forEach((m) => {
        const uid = m.userId || m.user_id || m.id;
        if (uid && !map.has(uid)) {
          map.set(uid, { teamId: t.id, teamName: t.name, isLeader: false });
        }
      });
    });
    return map;
  }, [teams]);

  // Candidate users for adding as members: role=coordinator, division=rnd, not in this team, not in any team if onlyUnassigned
  const availableCandidatesToAdd = useMemo(() => {
    if (!addMemberTarget) return [];
    return usersList.filter((u) => {
      // 1. Akun tidak suspended
      if (u.status === "suspended") return false;

      // 2. Role wajib coordinator (case-insensitive)
      const role = (u.role || "").toLowerCase();
      if (role !== "coordinator") return false;

      // 3. Divisi wajib rnd (case-insensitive)
      const division = (u.division || "").toLowerCase();
      if (division !== "rnd") return false;

      // 4. Belum terdaftar di tim ini (baik sebagai anggota maupun leader)
      const isAlreadyInThisTeam =
        (addMemberTarget.members || []).some((m) => (m.userId || m.id) === u.id) ||
        addMemberTarget.leaderUserId === u.id ||
        addMemberTarget.leader?.id === u.id;
      if (isAlreadyInThisTeam) return false;

      // 5. Belum masuk tim manapun (jika toggle hanya belum masuk tim aktif)
      if (onlyUnassigned && userTeamMembershipMap.has(u.id)) {
        return false;
      }

      return true;
    });
  }, [addMemberTarget, usersList, onlyUnassigned, userTeamMembershipMap]);

  // --------------------------------------------------------------------------
  // CREATE TEAM HANDLER (Admin Only)
  // --------------------------------------------------------------------------
  const openCreateModal = () => {
    setTeamName("");
    setLeaderUserId("");
    setIsActive(true);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!teamName.trim()) {
      setFormError("Nama tim tidak boleh kosong.");
      return;
    }
    if (!leaderUserId) {
      setFormError("Leader tim wajib dipilih.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/teams", {
        name: teamName.trim(),
        leaderUserId,
        isActive,
      });

      showToast(`Tim '${teamName}' berhasil dibuat.`);
      setIsCreateOpen(false);
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.message || "Gagal membuat tim.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // EDIT TEAM HANDLER (Admin Only)
  // --------------------------------------------------------------------------
  const openEditModal = (team) => {
    setEditTeamTarget(team);
    setTeamName(team.name || "");
    setLeaderUserId(team.leaderUserId || team.leader?.id || "");
    setIsActive(Boolean(team.isActive));
    setFormError(null);
  };

  const handleEditTeamSubmit = async (e) => {
    e.preventDefault();
    if (!editTeamTarget) return;
    setFormError(null);

    if (!teamName.trim()) {
      setFormError("Nama tim tidak boleh kosong.");
      return;
    }
    if (!leaderUserId) {
      setFormError("Leader tim wajib dipilih.");
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/teams/${editTeamTarget.id}`, {
        name: teamName.trim(),
        leaderUserId,
        isActive,
      });

      showToast(`Perubahan tim '${teamName}' berhasil disimpan.`);
      setEditTeamTarget(null);
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.message || "Gagal memperbarui tim.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // DELETE TEAM HANDLER (Admin Only)
  // --------------------------------------------------------------------------
  const handleDeleteTeamConfirm = async () => {
    if (!deleteTeamTarget) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/teams/${deleteTeamTarget.id}`);
      showToast(res.data?.message || `Tim '${deleteTeamTarget.name}' berhasil dihapus/dinonaktifkan.`);
      setDeleteTeamTarget(null);
      fetchTeams();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menghapus tim.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // ADD MEMBER HANDLER (Admin or Team Leader)
  // --------------------------------------------------------------------------
  const openAddMemberModal = (team) => {
    setAddMemberTarget(team);
    setSelectedUserIdToAdd("");
    setOnlyUnassigned(true);
    setFormError(null);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!addMemberTarget || !selectedUserIdToAdd) {
      setFormError("Pilih personel yang ingin ditambahkan.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/teams/${addMemberTarget.id}/members`, {
        userId: selectedUserIdToAdd,
      });

      showToast("Anggota berhasil ditambahkan ke tim.");
      setAddMemberTarget(null);
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.message || "Gagal menambahkan anggota.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // REMOVE MEMBER HANDLER (Admin or Team Leader)
  // --------------------------------------------------------------------------
  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return;
    const { team, member } = removeMemberTarget;

    try {
      setSubmitting(true);
      await api.delete(`/teams/${team.id}/members/${member.userId}`);
      showToast(`Anggota '${member.name}' berhasil dikeluarkan dari tim.`);
      setRemoveMemberTarget(null);
      fetchTeams();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal mengeluarkan anggota dari tim.");
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            backgroundColor: "#11222c",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            fontSize: "13px",
            fontWeight: 600,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
            Manajemen Tim RnD
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            Struktur tim divisi RnD untuk eskalasi tiket gangguan, penetapan Leader, dan manajemen keanggotaan personel.
          </p>
        </div>

        {/* ADMIN ACTION: BUAT TIM BARU */}
        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              backgroundColor: "#0e8587",
              color: "#ffffff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(14, 133, 135, 0.25)",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0b7173")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0e8587")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Tim Baru
          </button>
        )}
      </div>

      {/* TEAMS LISTING CONTAINER */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "13.5px", color: "#64748b" }}>Memuat daftar tim RnD...</div>
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "14px", fontWeight: 650, color: "#334155" }}>Belum ada tim yang terdaftar.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {teams.map((team) => {
            const isExpanded = expandedTeams.has(team.id);
            const isUserLeader = isLeaderOfTeam(team);
            const canManage = canManageTeamMembers(team);
            const members = team.members || [];

            return (
              <div
                key={team.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: isUserLeader ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                  boxShadow: isUserLeader
                    ? "0 4px 12px rgba(14, 133, 135, 0.08)"
                    : "0 1px 3px rgba(0,0,0,0.02)",
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                }}
              >
                {/* TEAM CARD HEADER */}
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "14px",
                    borderBottom: isExpanded ? "1px solid #edf2f7" : "none",
                    backgroundColor: isUserLeader ? "#f8fdfd" : "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        backgroundColor: team.isActive ? "#e8f7f6" : "#f1f5f9",
                        color: team.isActive ? "#0e8587" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 800,
                      }}
                    >
                      {team.name?.substring(0, 2).toUpperCase() || "TM"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                          {team.name}
                        </h3>

                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            backgroundColor: team.isActive ? "#dcfce7" : "#fee2e2",
                            color: team.isActive ? "#166534" : "#991b1b",
                          }}
                        >
                          {team.isActive ? "Aktif" : "Nonaktif"}
                        </span>

                        {isUserLeader && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 750,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor: "#0e8587",
                              color: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            ⭐ Anda Leader
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <span>
                          Leader: <strong>{team.leader?.name || "Belum Ditentukan"}</strong>
                        </span>
                        <span>•</span>
                        <span>{members.length} Personel Anggota</span>
                      </div>
                    </div>
                  </div>

                  {/* HEADER ACTION BUTTONS */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* BUTTON EXPAND/COLLAPSE */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(team.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 650,
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#334155",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isExpanded ? "Sembunyikan Anggota" : "Lihat Anggota"}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* ACTIONS FOR LEADER OR ADMIN: TAMBAH ANGGOTA & PINDAH LEADER */}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAddMemberModal(team)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "none",
                            backgroundColor: "#0e8587",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Tambah Anggota
                        </button>
                      </>
                    )}

                    {/* ADMIN ONLY ACTIONS: EDIT TIM & HAPUS TIM */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(team)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 650,
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTeamTarget(team)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 650,
                            border: "1px solid #fecaca",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            cursor: "pointer",
                          }}
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* TEAM MEMBERS SECTION (ACCORDION BODY) */}
                {isExpanded && (
                  <div style={{ padding: "16px 20px", backgroundColor: "#fafbfc" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                        Susunan Personel Anggota Tim ({members.length})
                      </span>

                      {!canManage && (
                        <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                          Mode Tinjau (Hanya Leader Tim / Admin yang dapat mengelola anggota)
                        </span>
                      )}
                    </div>

                    {members.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "16px",
                          borderRadius: "8px",
                          backgroundColor: "#ffffff",
                          border: "1px dashed #cbd5e1",
                          color: "#64748b",
                          fontSize: "12.5px",
                        }}
                      >
                        Belum ada anggota yang terdaftar di tim ini.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {members.map((m) => {
                          const isLeaderOfThisTeam = m.userId === team.leaderUserId || m.userId === team.leader?.id;
                          return (
                            <div
                              key={m.id || m.userId}
                              style={{
                                backgroundColor: isLeaderOfThisTeam ? "#f0fdfa" : "#ffffff",
                                padding: "12px 14px",
                                borderRadius: "8px",
                                border: isLeaderOfThisTeam ? "1.5px solid #0e8587" : "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                <div
                                  style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "50%",
                                    backgroundColor: isLeaderOfThisTeam ? "#0e8587" : "#e2e8f0",
                                    color: isLeaderOfThisTeam ? "#ffffff" : "#334155",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "13px",
                                    fontWeight: 750,
                                    flexShrink: 0,
                                  }}
                                >
                                  {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {m.name}
                                    </div>
                                    {isLeaderOfThisTeam && (
                                      <span
                                        style={{
                                          fontSize: "9.5px",
                                          fontWeight: 800,
                                          padding: "1px 5px",
                                          borderRadius: "3px",
                                          backgroundColor: "#0e8587",
                                          color: "#ffffff",
                                        }}
                                      >
                                        LEADER
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
                                    {m.username ? `@${m.username}` : (m.email || "-")}
                                  </div>
                                </div>
                              </div>

                              {/* KELUARKAN ANGGOTA BUTTON (Hanya jika canManage dan bukan Leader tim) */}
                              {canManage && !isLeaderOfThisTeam && (
                                <button
                                  type="button"
                                  onClick={() => setRemoveMemberTarget({ team, member: m })}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: "4px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "color 0.15s ease",
                                  }}
                                  title={`Keluarkan ${m.name} dari tim`}
                                  onMouseOver={(e) => (e.currentTarget.style.color = "#dc2626")}
                                  onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: BUAT TIM BARU (Admin Only)                                 */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Buat Tim RnD Baru" maxWidth="520px">
          <form onSubmit={handleCreateTeamSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {formError && (
              <div style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "12.5px" }}>
                {formError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Nama Tim <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Hardware, Software, Firmware"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Tunjuk Leader Tim <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={leaderUserId}
                onChange={(e) => setLeaderUserId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value="">-- Pilih Leader Tim --</option>
                {usersList
                  .filter((u) => {
                    if (u.status === "suspended") return false;
                    const r = (u.role || "").toLowerCase();
                    const d = (u.division || "").toLowerCase();
                    return r === "coordinator" && d === "rnd";
                  })
                  .map((u) => {
                    const membership = userTeamMembershipMap.get(u.id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username || u.email}){membership ? ` — [Leader di ${membership.teamName}]` : " — [Tersedia]"}
                      </option>
                    );
                  })}
              </select>
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                Khusus personel berstatus Coordinator divisi RnD. Leader otomatis menjadi anggota pertama tim ini.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <input
                type="checkbox"
                id="isActiveCreate"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="isActiveCreate" style={{ fontSize: "13px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                Tim Aktif & Dapat Menerima Penugasan Tiket
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #edf2f7" }}>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "13px", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", backgroundColor: "#0e8587", color: "#ffffff", fontSize: "13px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Menyimpan..." : "Buat Tim"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: EDIT TIM (Admin Only)                                     */}
      {/* ------------------------------------------------------------------ */}
      {editTeamTarget && (
        <Modal isOpen={Boolean(editTeamTarget)} onClose={() => setEditTeamTarget(null)} title={`Edit Tim: ${editTeamTarget.name}`} maxWidth="520px">
          <form onSubmit={handleEditTeamSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {formError && (
              <div style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "12.5px" }}>
                {formError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Nama Tim <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Leader Tim <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={leaderUserId}
                onChange={(e) => setLeaderUserId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                {usersList
                  .filter((u) => {
                    if (u.status === "suspended") return false;
                    const r = (u.role || "").toLowerCase();
                    const d = (u.division || "").toLowerCase();
                    return r === "coordinator" && d === "rnd";
                  })
                  .map((u) => {
                    const membership = userTeamMembershipMap.get(u.id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username || u.email}){membership ? ` — [Leader di ${membership.teamName}]` : " — [Tersedia]"}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="isActiveEdit" style={{ fontSize: "13px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                Status Tim Aktif
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #edf2f7" }}>
              <button
                type="button"
                onClick={() => setEditTeamTarget(null)}
                disabled={submitting}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "13px", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", backgroundColor: "#0e8587", color: "#ffffff", fontSize: "13px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: TAMBAH ANGGOTA TIM (Leader or Admin)                       */}
      {/* ------------------------------------------------------------------ */}
      {addMemberTarget && (
        <Modal
          isOpen={Boolean(addMemberTarget)}
          onClose={() => setAddMemberTarget(null)}
          title={`Tambah Anggota ke ${addMemberTarget.name}`}
          maxWidth="480px"
        >
          <form onSubmit={handleAddMemberSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {formError && (
              <div style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "12.5px" }}>
                {formError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Pilih Personel Coordinator RnD <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value="">
                  {availableCandidatesToAdd.length === 0
                    ? onlyUnassigned
                      ? "-- Tidak ada Coordinator RnD yang belum memiliki tim --"
                      : "-- Tidak ada personel Coordinator RnD yang tersedia --"
                    : "-- Pilih Personel Coordinator RnD --"}
                </option>
                {availableCandidatesToAdd.map((u) => {
                  const existing = userTeamMembershipMap.get(u.id);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} (@{u.username || u.email}){existing ? ` — [Sudah di ${existing.teamName}]` : " — [Belum Memiliki Tim]"}
                    </option>
                  );
                })}
              </select>

              {/* TOGGLE ONLY UNASSIGNED FILTER */}
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "7px" }}>
                <input
                  type="checkbox"
                  id="onlyUnassignedFilter"
                  checked={onlyUnassigned}
                  onChange={(e) => {
                    setOnlyUnassigned(e.target.checked);
                    setSelectedUserIdToAdd("");
                  }}
                  style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0e8587" }}
                />
                <label
                  htmlFor="onlyUnassignedFilter"
                  style={{ fontSize: "12px", color: "#475569", cursor: "pointer", userSelect: "none" }}
                >
                  Hanya tampilkan yang belum masuk tim manapun
                </label>
              </div>

              {availableCandidatesToAdd.length === 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    fontSize: "12px",
                    color: "#b45309",
                  }}
                >
                  {onlyUnassigned
                    ? "Seluruh personel Coordinator divisi RnD saat ini sudah terdaftar ke dalam tim. Hilangkan centang di atas jika ingin menugaskan personel lintas tim."
                    : "Tidak ada personel Coordinator RnD yang tersedia untuk ditambahkan."}
                </div>
              )}

              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "block" }}>
                Khusus personel dengan peran <strong>Coordinator</strong> dan divisi <strong>RnD</strong>.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #edf2f7" }}>
              <button
                type="button"
                onClick={() => setAddMemberTarget(null)}
                disabled={submitting}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "13px", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", backgroundColor: "#0e8587", color: "#ffffff", fontSize: "13px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Menambahkan..." : "Tambah ke Tim"}
              </button>
            </div>
          </form>
        </Modal>
      )}



      {/* ------------------------------------------------------------------ */}
      {/* MODAL 5: KONFIRMASI HAPUS TIM (Admin Only)                          */}
      {/* ------------------------------------------------------------------ */}
      {deleteTeamTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteTeamTarget)}
          onClose={() => setDeleteTeamTarget(null)}
          onConfirm={handleDeleteTeamConfirm}
          loading={submitting}
          title="Hapus / Nonaktifkan Tim"
          itemName={deleteTeamTarget.name}
          description="Jika tim memiliki keterkaitan dengan tiket aktif atau riwayat penanganan, sistem secara aman akan menonaktifkannya."
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 6: KONFIRMASI KELUARKAN ANGGOTA (Leader or Admin)             */}
      {/* ------------------------------------------------------------------ */}
      {removeMemberTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(removeMemberTarget)}
          onClose={() => setRemoveMemberTarget(null)}
          onConfirm={handleRemoveMemberConfirm}
          loading={submitting}
          title="Keluarkan Anggota dari Tim"
          itemName={`${removeMemberTarget.member?.name} (${removeMemberTarget.team?.name})`}
          description={`Apakah Anda yakin ingin mengeluarkan '${removeMemberTarget.member?.name}' dari tim ${removeMemberTarget.team?.name}?`}
        />
      )}
    </div>
  );
}
