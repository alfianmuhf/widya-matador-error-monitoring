import { useState, useEffect, useMemo } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import DeleteConfirmModal from "../common/DeleteConfirmModal.jsx";

export default function AddAssigneeModal({ isOpen, onClose, ticket, onSuccess }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";

  // Tab State: 'collaborate' (Tim Kolaborasi) | 'directHandover' (Alih Tanggung Jawab Langsung)
  const [activeTab, setActiveTab] = useState("collaborate");

  // All Available Teams
  const [allTeams, setAllTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Form States: Tim Kolaborasi
  const [collaborateTeamId, setCollaborateTeamId] = useState("");

  // States: Alih Tanggung Jawab ke Tim Kolaborator (Promote)
  const [promoteTeamTarget, setPromoteTeamTarget] = useState(null);
  const [promoteNotes, setPromoteNotes] = useState("");

  // Form States: Alih Tanggung Jawab Langsung (Direct Handover & Remove Current Team)
  const [directTargetTeamId, setDirectTargetTeamId] = useState("");
  const [directHandoverNotes, setDirectHandoverNotes] = useState("");
  const [confirmDirectHandover, setConfirmDirectHandover] = useState(false);

  // Form States: Remove Collaborating Team
  const [removingTeamTarget, setRemovingTeamTarget] = useState(null);

  // Submitting & Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Local active ticket state to allow instant reactive updates within the modal
  const [activeTicket, setActiveTicket] = useState(ticket);

  useEffect(() => {
    setActiveTicket(ticket);
  }, [ticket]);

  // Primary team and teams associated with ticket
  const currentTeam = activeTicket?.currentTeam || activeTicket?.current_team;
  const currentTeamId =
    activeTicket?.currentTeamId ||
    activeTicket?.current_team_id ||
    currentTeam?.id ||
    null;

  // Additional collaborating teams ONLY:
  // RULE: Tim yang id team-nya masuk di tabel tickets (current_team_id) TIDAK BOLEH ditampilkan di kolaborator!
  const collaboratingTeams = useMemo(() => {
    if (!activeTicket) return [];

    const rawList =
      (Array.isArray(activeTicket.teams) && activeTicket.teams) ||
      (Array.isArray(activeTicket.ticket_teams) && activeTicket.ticket_teams) ||
      [];

    const result = [];
    const seenTeamIds = new Set();

    for (const item of rawList) {
      if (!item) continue;

      // Extract the underlying team object
      const teamObj = item.team || item;
      const actualTeamId = item.teamId || item.team_id || teamObj?.id;

      if (!actualTeamId) continue;

      // RULE: Tim yang id team-nya masuk di tabel tickets (current_team_id) TIDAK BOLEH ditampilkan di kolaborator!
      if (currentTeamId && actualTeamId === currentTeamId) {
        continue;
      }

      // Avoid duplicate entries
      if (seenTeamIds.has(actualTeamId)) {
        continue;
      }
      seenTeamIds.add(actualTeamId);

      result.push({
        id: actualTeamId, // Guarantee: teams table ID!
        teamId: actualTeamId,
        ticketTeamRowId: item.id,
        name: teamObj?.name || item.name || "Tim RnD",
        leader: teamObj?.leader || item.leader || null,
      });
    }

    return result;
  }, [activeTicket, currentTeamId]);

  // Set of already assigned team IDs (Primary Team + All Collaborating Teams)
  const assignedTeamIds = useMemo(() => {
    const ids = new Set();
    if (currentTeamId) ids.add(currentTeamId);
    collaboratingTeams.forEach((t) => ids.add(t.id));
    return ids;
  }, [collaboratingTeams, currentTeamId]);

  // Check if current user is the Leader of this ticket's primary team (tickets.current_team_id)
  const isLeaderOfCurrentTeam = useMemo(() => {
    if (!currentUser?.id) return false;
    if (isAdmin) return true;

    // HANYA Leader dari tim utama penanggung jawab (tickets.current_team_id)
    if (
      currentTeam?.leader_user_id === currentUser.id ||
      currentTeam?.leader?.id === currentUser.id ||
      currentTeam?.leaderUserId === currentUser.id
    ) {
      return true;
    }

    // Jika belum ada tim penanggung jawab di tiket, koordinator leader tim RnD boleh claim pertama
    if (!currentTeamId) {
      return allTeams.some(
        (t) =>
          t.leader_user_id === currentUser.id ||
          t.leaderUserId === currentUser.id ||
          t.leader?.id === currentUser.id
      );
    }

    return false;
  }, [currentUser, isAdmin, currentTeam, currentTeamId, allTeams]);

  // Fetch all master teams when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setCollaborateTeamId("");
    setDirectTargetTeamId("");
    setDirectHandoverNotes("");
    setConfirmDirectHandover(false);
    setPromoteTeamTarget(null);
    setPromoteNotes("");
    setRemovingTeamTarget(null);

    setLoadingTeams(true);
    api
      .get("/teams?limit=100")
      .then((res) => {
        const teams = res.data?.data || [];
        setAllTeams(teams);
      })
      .catch((err) => {
        console.error("Gagal memuat master tim:", err);
      })
      .finally(() => {
        setLoadingTeams(false);
      });
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  // --------------------------------------------------------------------------
  // HANDLER: TAMBAH TIM KOLABORASI
  // --------------------------------------------------------------------------
  const handleAddCollaborateTeam = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!collaborateTeamId) {
      setErrorMessage("Pilih tim RnD yang ingin diajak berkolaborasi.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/ticket-management/${activeTicket.id}/teams`, {
        teamId: collaborateTeamId,
      });

      const updated = res.data?.data?.ticket || res.data?.data;
      const addedTeam = allTeams.find((t) => t.id === collaborateTeamId);
      const msg = res.data?.message || `Tim '${addedTeam?.name || "RnD"}' berhasil ditambahkan ke tim kolaborasi!`;
      setSuccessMessage(msg);
      setCollaborateTeamId("");

      if (updated && updated.id) {
        setActiveTicket(updated);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error("Gagal menambah tim kolaborasi:", err);
      const msg = err.response?.data?.message || "Gagal menambahkan tim kolaborasi.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLER: ALIH TANGGUNG JAWAB KE TIM KOLABORATOR (Promote Team)
  // Tim baru jadi Tim Utama, tim lama tetap ada sebagai kolaborator
  // --------------------------------------------------------------------------
  const handlePromoteTeamConfirm = async () => {
    if (!promoteTeamTarget) return;

    try {
      setSubmitting(true);
      const res = await api.patch(`/ticket-management/${activeTicket.id}/team`, {
        teamId: promoteTeamTarget.id,
        notes: promoteNotes.trim() || undefined,
        removeOldTeam: false,
      });

      const updated = res.data?.data?.ticket || res.data?.data;
      const msg = res.data?.message || `Tanggung jawab utama berhasil dialihkan ke tim '${promoteTeamTarget.name}'!`;
      setSuccessMessage(msg);
      setPromoteTeamTarget(null);
      setPromoteNotes("");

      if (updated && updated.id) {
        setActiveTicket(updated);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error("Gagal mengalihkan tanggung jawab:", err);
      const msg = err.response?.data?.message || "Gagal mengalihkan tanggung jawab tiket.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLER: HAPUS TIM KOLABORASI
  // --------------------------------------------------------------------------
  const handleRemoveTeamConfirm = async () => {
    if (!removingTeamTarget) return;

    try {
      setSubmitting(true);
      const res = await api.delete(`/ticket-management/${activeTicket.id}/teams/${removingTeamTarget.id}`);
      const updated = res.data?.data?.ticket || res.data?.data;
      setSuccessMessage(`Tim '${removingTeamTarget.name}' berhasil dikeluarkan dari tiket.`);
      setRemovingTeamTarget(null);

      if (updated && updated.id) {
        setActiveTicket(updated);
      } else {
        setActiveTicket((prev) => {
          if (!prev) return prev;
          const nextTeams = (prev.teams || []).filter(
            (t) => (t.teamId || t.team?.id || t.id) !== removingTeamTarget.id
          );
          const nextTicketTeams = (prev.ticket_teams || []).filter(
            (tt) => (tt.team_id || tt.team?.id || tt.id) !== removingTeamTarget.id
          );
          return {
            ...prev,
            teams: nextTeams,
            ticket_teams: nextTicketTeams,
          };
        });
      }
      if (onSuccess) {
        onSuccess(updated || { id: activeTicket.id });
      }
    } catch (err) {
      console.error("Gagal menghapus tim:", err);
      const msg = err.response?.data?.message || "Gagal menghapus tim dari tiket.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLER: ALIH TANGGUNG JAWAB LANGSUNG & HAPUS TIM PENGALIH
  // Tim baru langsung jadi leader, tim lama langsung dikeluarkan dari tiket
  // --------------------------------------------------------------------------
  const handleDirectHandoverConfirm = async () => {
    if (!directTargetTeamId) return;

    try {
      setSubmitting(true);
      const res = await api.patch(`/ticket-management/${activeTicket.id}/team`, {
        teamId: directTargetTeamId,
        notes: directHandoverNotes.trim() || undefined,
        removeOldTeam: true,
      });

      const updated = res.data?.data?.ticket || res.data?.data;
      const selectedTeam = allTeams.find((t) => t.id === directTargetTeamId);
      const msg =
        res.data?.message ||
        `Tanggung jawab berhasil diserahkan ke '${selectedTeam?.name || "Tim Baru"}' dan tim Anda telah dilepaskan dari tiket.`;
      setSuccessMessage(msg);
      setConfirmDirectHandover(false);
      setDirectTargetTeamId("");
      setDirectHandoverNotes("");

      if (updated && updated.id) {
        setActiveTicket(updated);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error("Gagal melakukan serah terima langsung:", err);
      const msg = err.response?.data?.message || "Gagal melakukan serah terima langsung.";
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
        zIndex: 9999,
        backgroundColor: "rgba(11, 30, 39, 0.65)",
        backdropFilter: "blur(3px)",
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
          maxWidth: "640px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "3.5px", height: "16px", backgroundColor: "#0e8587", borderRadius: "2px" }} />
              <h2 style={{ fontSize: "16px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                Kelola Tim & Handover Tiket
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 750,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  backgroundColor: "#e0f2fe",
                  color: "#0369a1",
                  fontFamily: "monospace",
                }}
              >
                {ticket.id}
              </span>
            </div>
            <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Kelola kolaborasi tim lintas divisi atau alihkan tanggung jawab utama penanganan tiket.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* CURRENT PRIMARY TEAM INFO BANNER */}
        <div
          style={{
            padding: "12px 22px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Tim Penanggung Jawab Utama (Claimer):
            </span>
            <div style={{ fontSize: "14px", fontWeight: 750, color: "#0f172a", marginTop: "1px" }}>
              {currentTeam ? currentTeam.name : "Belum Ditugaskan"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Leader Penanggung Jawab:</span>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0e8587", display: "flex", alignItems: "center", gap: "4px" }}>
              ⭐ {currentTeam?.leader?.name || "Belum ada Leader"}
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div style={{ margin: "14px 22px 0", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", color: "#dc2626", fontSize: "12.5px" }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ margin: "14px 22px 0", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f0fdf4", border: "1px solid #dcfce7", color: "#16a34a", fontSize: "12.5px", fontWeight: 600 }}>
            {successMessage}
          </div>
        )}

        {/* TAB BUTTONS (HANYA 2 TAB: TIM KOLABORASI & ALIH TANGGUNG JAWAB LANGSUNG) */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 22px",
            marginTop: "10px",
            gap: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("collaborate");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px 4px",
              border: "none",
              borderBottom: activeTab === "collaborate" ? "2.5px solid #0e8587" : "2.5px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "collaborate" ? "#0e8587" : "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Tim Kolaborasi
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("directHandover");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px 4px",
              border: "none",
              borderBottom: activeTab === "directHandover" ? "2.5px solid #0e8587" : "2.5px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "directHandover" ? "#0e8587" : "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Alih Tanggung Jawab Langsung
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE BODY) */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* ============================================================== */}
          {/* TAB 1: TIM KOLABORASI                                          */}
          {/* ============================================================== */}
          {activeTab === "collaborate" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Daftar Tim Kolaborator
                  </span>
                  {collaboratingTeams.length > 0 && (
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", backgroundColor: "#e0f2fe", color: "#0369a1", borderRadius: "10px" }}>
                      {collaboratingTeams.length} Tim Kolaborator
                    </span>
                  )}
                </div>

                {collaboratingTeams.length === 0 ? (
                  <div
                    style={{
                      padding: "16px 18px",
                      borderRadius: "8px",
                      backgroundColor: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 650, color: "#334155" }}>
                      Belum Ada Tim Kolaborator
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Tiket ini saat ini hanya ditangani oleh tim utama (<strong>{currentTeam?.name || "RnD"}</strong>).<br />
                      Gunakan form di bawah untuk mengajak tim RnD lain berkolaborasi atau sebelum mengalihkan tanggung jawab tiket.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {collaboratingTeams.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13.5px", fontWeight: 750, color: "#0f172a" }}>
                              {t.name}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", backgroundColor: "#ecfdf5", color: "#047857", borderRadius: "3px" }}>
                              KOLABORATOR
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Leader: <strong>{t.leader?.name || "Belum ada leader"}</strong>
                          </div>
                        </div>

                        {/* TOMBOL AKSI UNTUK TIM KOLABORASI */}
                        {isLeaderOfCurrentTeam && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {/* Alihkan Tanggung Jawab Utama ke Tim Kolaborasi ini */}
                            <button
                              type="button"
                              onClick={() => {
                                setPromoteTeamTarget(t);
                                setPromoteNotes("");
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #ccfbf1",
                                backgroundColor: "#f0fdfa",
                                color: "#0e8587",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              title="Jadikan tim ini sebagai Tim Utama penanggung jawab tiket"
                            >
                              ⭐ Jadikan Tim Utama
                            </button>

                            {/* Keluarkan Tim Kolaborasi */}
                            <button
                              type="button"
                              onClick={() => setRemovingTeamTarget(t)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Keluarkan tim ini dari tiket"
                            >
                              Keluarkan
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FORM TAMBAH TIM KOLABORASI */}
              {isLeaderOfCurrentTeam ? (
                <form onSubmit={handleAddCollaborateTeam} style={{ marginTop: "6px", paddingTop: "14px", borderTop: "1px solid #edf2f7" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Ajak Tim RnD Baru Berkolaborasi
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={collaborateTeamId}
                      onChange={(e) => setCollaborateTeamId(e.target.value)}
                      disabled={loadingTeams || submitting}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    >
                      <option value="">-- Pilih Tim RnD yang Belum Terdaftar --</option>
                      {allTeams
                        .filter((t) => !assignedTeamIds.has(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} • Leader: {t.leader?.name || "-"}
                          </option>
                        ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!collaborateTeamId || submitting}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#0e8587",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: !collaborateTeamId || submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      + Tambah Tim
                    </button>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px" }}>
                    Hanya menampilkan tim RnD yang belum pernah masuk ke tiket ini. Tim yang ditambahkan dapat dialihkan menjadi Tim Utama kapan saja.
                  </div>
                </form>
              ) : (
                <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12px", color: "#64748b" }}>
                  Hanya Leader tim penanggung jawab atau Admin yang dapat menambahkan atau mengelola tim kolaborator.
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ALIH TANGGUNG JAWAB LANGSUNG                            */}
          {/* ============================================================== */}
          {activeTab === "directHandover" && (
            <div>
              {!isLeaderOfCurrentTeam ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Hak Akses Khusus:</strong> Hanya <strong>Leader</strong> dari tim penanggung jawab saat ini ({currentTeam?.leader?.name || "Leader Tim"}) atau <strong>Admin</strong> yang berwenang melakukan serah terima langsung dan melepaskan tiket.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!directTargetTeamId) {
                      setErrorMessage("Silakan pilih tim RnD penerima tanggung jawab.");
                      return;
                    }
                    setConfirmDirectHandover(true);
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#fff7ed",
                      border: "1px solid #ffedd5",
                      fontSize: "12.5px",
                      color: "#c2410c",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Mekanisme Serah Terima Langsung:</strong> Menyerahkan kepemilikan tiket sepenuhnya ke tim RnD baru. Tim baru akan langsung menjadi <strong>Tim Utama (Leader Penanggung Jawab)</strong>, dan tim Anda saat ini (<strong>{currentTeam?.name}</strong>) akan <strong>langsung dilepas / dihapus</strong> dari tiket ini.
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Pilih Tim Divisi RnD Penerima Tanggung Jawab <span style={{ color: "#dc2626" }}>*</span>
                    </label>

                    <select
                      value={directTargetTeamId}
                      onChange={(e) => setDirectTargetTeamId(e.target.value)}
                      disabled={loadingTeams || submitting}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "13px",
                        backgroundColor: "#ffffff",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- Pilih Tim RnD Baru --</option>
                      {allTeams
                        .filter((t) => !assignedTeamIds.has(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} • Leader: {t.leader?.name || "-"}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Catatan / Alasan Serah Terima Langsung
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Tiket dialihkan sepenuhnya ke tim Hardware karena kendala murni pada modul sensor fisik..."
                      value={directHandoverNotes}
                      onChange={(e) => setDirectHandoverNotes(e.target.value)}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                    <button
                      type="submit"
                      disabled={submitting || !directTargetTeamId}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: !directTargetTeamId || submitting ? "#94a3b8" : "#ea580c",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: !directTargetTeamId || submitting ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(234, 88, 12, 0.2)",
                      }}
                    >
                      {submitting ? "Memproses..." : "Alihkan & Lepas Tiket"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            Tutup
          </button>
        </div>
      </div>

      {/* MODAL KONFIRMASI: ALIH TANGGUNG JAWAB KE TIM KOLABORATOR */}
      {promoteTeamTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(11, 30, 39, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => !submitting && setPromoteTeamTarget(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              padding: "22px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#f0fdfa",
                  color: "#0e8587",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                ⭐
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                  Alihkan Tanggung Jawab Utama
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  Jadikan tim kolaborator sebagai penanggung jawab utama tiket
                </p>
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12.5px", color: "#334155", lineHeight: 1.5, marginBottom: "14px" }}>
              Apakah Anda yakin ingin menyerahkan tanggung jawab utama tiket kepada tim <strong>{promoteTeamTarget.name}</strong>?
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
                Tim Anda (<strong>{currentTeam?.name}</strong>) akan tetap terhubung ke tiket ini sebagai tim kolaborator.
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Catatan Pengalihan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Tanggung jawab utama dialihkan karena komponen software telah terselesaikan..."
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setPromoteTeamTarget(null)}
                disabled={submitting}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePromoteTeamConfirm}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: submitting ? "#94a3b8" : "#0e8587",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Memproses..." : "Ya, Alihkan Tanggung Jawab"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI: ALIH TANGGUNG JAWAB LANGSUNG & HAPUS TIM */}
      {confirmDirectHandover && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(11, 30, 39, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => !submitting && setConfirmDirectHandover(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              padding: "22px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#fff7ed",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
                  Konfirmasi Alih Tanggung Jawab Langsung
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  Serah terima langsung dan pelepasan tim pengalih
                </p>
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "#fff7ed", border: "1px solid #ffedd5", fontSize: "12.5px", color: "#c2410c", lineHeight: 1.5, marginBottom: "16px" }}>
              <strong>Perhatian:</strong> Tanggung jawab tiket ini akan diserahkan sepenuhnya kepada tim <strong>{allTeams.find((t) => t.id === directTargetTeamId)?.name}</strong>.<br />
              Tim Anda saat ini (<strong>{currentTeam?.name}</strong>) akan <strong>langsung dikeluarkan dari tiket ini</strong> dan tidak lagi memiliki akses pembaruan tiket.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setConfirmDirectHandover(false)}
                disabled={submitting}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDirectHandoverConfirm}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: submitting ? "#94a3b8" : "#ea580c",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Memproses..." : "Ya, Serahkan & Lepas Tiket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KONFIRMASI HAPUS TIM KOLABORASI */}
      {removingTeamTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(removingTeamTarget)}
          onClose={() => setRemovingTeamTarget(null)}
          onConfirm={handleRemoveTeamConfirm}
          loading={submitting}
          title="Keluarkan Tim Kolaborasi"
          itemName={removingTeamTarget.name}
          description={`Apakah Anda yakin ingin mengeluarkan tim '${removingTeamTarget.name}' dari kolaborasi penanganan tiket ${ticket.id}?`}
        />
      )}
    </div>
  );
}
