import * as ticketRepo from "../ticket.repository.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Format date to 'DD Mon YYYY' in WIB (UTC+7)
 */
export const formatDateWIB = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const day = String(wib.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[wib.getMonth()];
  const year = wib.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format date to 'DD Mon YYYY, HH:mm' in WIB (UTC+7)
 */
export const formatDateTimeWIB = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const day = String(wib.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[wib.getMonth()];
  const year = wib.getFullYear();
  const hours = String(wib.getHours()).padStart(2, "0");
  const minutes = String(wib.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

/**
 * Compute friendly duration text (MTTR)
 */
export const computeDurationText = (createdAt, resolvedAt) => {
  if (!createdAt) return "—";
  const start = new Date(createdAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "< 1 menit";
  if (minutes < 60) return `${minutes} menit`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} hari ${remainingHours} jam` : `${days} hari`;
};

/**
 * Capitalize status string (e.g. open -> Open, escalated -> Escalated)
 */
export const capitalizeStatus = (status) => {
  if (!status) return "Open";
  const s = String(status).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Format Prisma Ticket model into a frontend-friendly object.
 * Retrieves current state from the latest ticket_history (matching current_version).
 */
export const formatTicket = (t) => {
  if (!t) return null;

  // Find latest history row matching current_version (or first element in desc sorted array)
  const currentHistory =
    (t.ticket_history || []).find((h) => h.version === t.current_version) ||
    t.ticket_history?.[0] ||
    {};

  // Find initial history row (version 0) to know original reporter
  const initialHistory =
    (t.ticket_history || []).find((h) => h.version === 0) ||
    t.ticket_history?.[t.ticket_history.length - 1] ||
    {};

  const rawStatus = currentHistory.status || "open";
  const displayStatus = capitalizeStatus(rawStatus);

  // Determine reporter name
  let reporter = "-";
  if (initialHistory.changed_by_user) {
    reporter = initialHistory.changed_by_user.name || initialHistory.changed_by_user.username || initialHistory.changed_by_user.email;
  } else if (initialHistory.changed_by_telegram) {
    reporter = initialHistory.changed_by_telegram.username
      ? `@${initialHistory.changed_by_telegram.username}`
      : initialHistory.changed_by_telegram.full_name || initialHistory.changed_by_telegram.telegram_id;
  }

  // Find resolved time if solved
  const solvedRow = (t.ticket_history || []).find((h) => h.status === "solved");
  const resolvedAt = solvedRow ? solvedRow.changed_at : null;

  // Format history array
  const formattedHistory = (t.ticket_history || []).map((h) => {
    let author = "Sistem";
    if (h.changed_by_user) {
      author = h.changed_by_user.name || h.changed_by_user.username || h.changed_by_user.email;
    } else if (h.changed_by_telegram) {
      author = h.changed_by_telegram.username
        ? `@${h.changed_by_telegram.username}`
        : h.changed_by_telegram.full_name || "Telegram User";
    }

    const action = h.notes || `Update ke versi ${h.version}`;
    const source = h.changed_by_user_id
      ? "web"
      : h.changed_by_telegram_user_id
      ? "telegram"
      : "sistem";

    return {
      id: h.id,
      ticketId: h.ticket_id,
      version: h.version,
      status: capitalizeStatus(h.status),
      rawStatus: h.status,
      action,
      notes: h.notes || null,
      timestamp: formatDateTimeWIB(h.changed_at),
      changedAt: h.changed_at,
      author,
      authorRole: h.changed_by_user?.role || null,
      authorDivision: h.changed_by_user?.division || h.changed_by_telegram?.division || null,
      source,
      changedByUserId: h.changed_by_user_id,
      changedByTelegramUserId: h.changed_by_telegram_user_id,
      damageDescription: h.damage_description,
      damage_description: h.damage_description,
      actionTaken: h.action_taken,
      action_taken: h.action_taken,
      rootCause: h.root_cause,
      root_cause: h.root_cause,
      severity: capitalizeStatus(h.severity),
      rawSeverity: h.severity,
      teamId: h.team_id,
      team_id: h.team_id,
      team: h.team ? { id: h.team.id, name: h.team.name } : null,
    };
  });

  // Format current team
  const currentTeam = t.current_team
    ? {
        id: t.current_team.id,
        name: t.current_team.name,
        leaderUserId: t.current_team.leader_user_id,
        leader: t.current_team.leader
          ? {
              id: t.current_team.leader.id,
              name: t.current_team.leader.name,
              username: t.current_team.leader.username,
              email: t.current_team.leader.username,
              role: t.current_team.leader.role,
              division: t.current_team.leader.division,
              telegramUser: t.current_team.leader.telegram_user || null,
            }
          : null,
      }
    : null;

  // Format teams list
  const formattedTeams = (t.ticket_teams || []).map((tt) => ({
    id: tt.id,
    ticketId: tt.ticket_id,
    teamId: tt.team_id,
    assignedAt: tt.assigned_at,
    isCurrentTeam: tt.team_id === t.current_team_id,
    team: tt.team
      ? {
          id: tt.team.id,
          name: tt.team.name,
          leaderUserId: tt.team.leader_user_id,
          leader: tt.team.leader
            ? {
                id: tt.team.leader.id,
                name: tt.team.leader.name,
                username: tt.team.leader.username,
                email: tt.team.leader.username,
                role: tt.team.leader.role,
                division: tt.team.leader.division,
                telegramUser: tt.team.leader.telegram_user || null,
              }
            : null,
          membersCount: tt.team.members?.length || 0,
          members: (tt.team.members || []).map((m) => ({
            id: m.id,
            userId: m.user_id,
            name: m.user?.name || "Unknown",
            username: m.user?.username || "-",
            email: m.user?.username || "-",
            telegramUser: m.user?.telegram_user || null,
          })),
        }
      : null,
  }));

  // Flattened assignees for backward compatibility (all unique members from all assigned teams)
  const assigneesMap = new Map();
  if (t.current_team?.leader) {
    assigneesMap.set(t.current_team.leader.id, {
      id: t.current_team.leader.id,
      ticketId: t.id,
      isLeader: true,
      name: t.current_team.leader.name,
      identifier: t.current_team.leader.username,
      username: t.current_team.leader.username,
      userId: t.current_team.leader.id,
      user_id: t.current_team.leader.id,
      telegramUserId: t.current_team.leader.telegram_user?.id || null,
      telegram_user_id: t.current_team.leader.telegram_user?.id || null,
      user: t.current_team.leader,
      telegramUser: t.current_team.leader.telegram_user || null,
      teamId: t.current_team.id,
      teamName: t.current_team.name,
    });
  }

  (t.current_team?.members || []).forEach((m) => {
    if (m.user && !assigneesMap.has(m.user.id)) {
      assigneesMap.set(m.user.id, {
        id: m.id,
        ticketId: t.id,
        isLeader: m.user.id === t.current_team?.leader_user_id,
        name: m.user.name,
        identifier: m.user.username,
        username: m.user.username,
        userId: m.user.id,
        user_id: m.user.id,
        telegramUserId: m.user.telegram_user?.id || null,
        telegram_user_id: m.user.telegram_user?.id || null,
        user: m.user,
        telegramUser: m.user.telegram_user || null,
        teamId: t.current_team.id,
        teamName: t.current_team.name,
      });
    }
  });

  (t.ticket_teams || []).forEach((tt) => {
    if (tt.team?.leader && !assigneesMap.has(tt.team.leader.id)) {
      assigneesMap.set(tt.team.leader.id, {
        id: tt.team.leader.id,
        ticketId: t.id,
        isLeader: tt.team.id === t.current_team_id,
        name: tt.team.leader.name,
        identifier: tt.team.leader.username,
        username: tt.team.leader.username,
        userId: tt.team.leader.id,
        user_id: tt.team.leader.id,
        telegramUserId: tt.team.leader.telegram_user?.id || null,
        telegram_user_id: tt.team.leader.telegram_user?.id || null,
        user: tt.team.leader,
        telegramUser: tt.team.leader.telegram_user || null,
        teamId: tt.team.id,
        teamName: tt.team.name,
      });
    }
    (tt.team?.members || []).forEach((m) => {
      if (m.user && !assigneesMap.has(m.user.id)) {
        assigneesMap.set(m.user.id, {
          id: m.id,
          ticketId: t.id,
          isLeader: m.user.id === t.current_team?.leader_user_id,
          name: m.user.name,
          identifier: m.user.username,
          username: m.user.username,
          userId: m.user.id,
          user_id: m.user.id,
          telegramUserId: m.user.telegram_user?.id || null,
          telegram_user_id: m.user.telegram_user?.id || null,
          user: m.user,
          telegramUser: m.user.telegram_user || null,
          teamId: tt.team.id,
          teamName: tt.team.name,
        });
      }
    });
  });
  const formattedAssignees = Array.from(assigneesMap.values());

  return {
    id: t.id,
    ticketId: t.id,
    currentVersion: t.current_version,
    current_version: t.current_version,
    unit: t.asset?.unit_code || "-",
    unitCode: t.asset?.unit_code || "-",
    unit_code: t.asset?.unit_code || "-",
    unitType: t.asset?.asset_type || "portable",
    client: t.asset?.client?.name || "-",
    clientId: t.asset?.client?.id || null,
    location: t.asset?.location?.name || "-",
    locationId: t.asset?.location?.id || null,
    component: t.failure_code?.component?.name || "-",
    componentId: t.failure_code?.component?.id || null,
    failureCode: t.failure_code?.code || "-",
    failureCodeId: t.failure_code?.id || null,
    failureName: t.failure_code?.name || t.failure_code?.description || "",
    severity: capitalizeStatus(currentHistory.severity || "rendah"),
    rawSeverity: currentHistory.severity || "rendah",
    status: displayStatus,
    rawStatus: rawStatus,
    createdAt: t.open_at,
    created_at: t.open_at,
    openAt: t.open_at,
    open_at: t.open_at,
    escalatedAt: t.escalated_at || null,
    escalated_at: t.escalated_at || null,
    solvedAt: t.solved_at || resolvedAt || null,
    solved_at: t.solved_at || resolvedAt || null,
    createdDateText: formatDateWIB(t.open_at),
    createdDateTimeText: formatDateTimeWIB(t.open_at),
    openDateText: formatDateWIB(t.open_at),
    openDateTimeText: formatDateTimeWIB(t.open_at),
    escalatedDateText: formatDateWIB(t.escalated_at),
    escalatedDateTimeText: formatDateTimeWIB(t.escalated_at),
    solvedDateText: formatDateWIB(t.solved_at || resolvedAt),
    solvedDateTimeText: formatDateTimeWIB(t.solved_at || resolvedAt),
    timeToAnalysis: t.escalated_at ? computeDurationText(t.open_at, t.escalated_at) : "-",
    timeToAnalysisText: t.escalated_at ? computeDurationText(t.open_at, t.escalated_at) : "-",
    timeToAnalysisMs: t.escalated_at ? Math.max(0, new Date(t.escalated_at).getTime() - new Date(t.open_at).getTime()) : null,
    timeToSolve: (t.solved_at || resolvedAt) ? computeDurationText(t.open_at, t.solved_at || resolvedAt) : "-",
    timeToSolveText: (t.solved_at || resolvedAt) ? computeDurationText(t.open_at, t.solved_at || resolvedAt) : "-",
    timeToSolveMs: (t.solved_at || resolvedAt) ? Math.max(0, new Date(t.solved_at || resolvedAt).getTime() - new Date(t.open_at).getTime()) : null,
    durationText: computeDurationText(t.open_at, t.solved_at || resolvedAt),
    source: initialHistory.changed_by_telegram_user_id ? "telegram" : "dashboard",
    reporter,
    reporterUserId: initialHistory.changed_by_user_id || null,
    reporterTelegramId: initialHistory.changed_by_telegram_user_id || null,
    aftersalesUserId: t.aftersales_user_id,
    aftersales_user_id: t.aftersales_user_id,
    aftersalesUser: t.aftersales_user
      ? {
          id: t.aftersales_user.id,
          name: t.aftersales_user.name,
          username: t.aftersales_user.username,
          email: t.aftersales_user.username,
          role: t.aftersales_user.role,
          division: t.aftersales_user.division,
          telegramUser: t.aftersales_user.telegram_user || null,
        }
      : null,
    description: currentHistory.damage_description || "-",
    damageDescription: currentHistory.damage_description || null,
    damage_description: currentHistory.damage_description || null,
    handling: currentHistory.action_taken || "Belum ada penanganan",
    actionTaken: currentHistory.action_taken || null,
    action_taken: currentHistory.action_taken || null,
    cause: currentHistory.root_cause || "-",
    rootCause: currentHistory.root_cause || null,
    root_cause: currentHistory.root_cause || null,
    resolvedAt,
    history: formattedHistory,
    currentTeamId: t.current_team_id,
    current_team_id: t.current_team_id,
    currentTeam,
    current_team: currentTeam,
    teams: formattedTeams,
    ticketTeams: formattedTeams,
    leader: currentTeam?.leader || null,
    leaderAssigneeId: currentTeam?.leaderUserId || null,
    leaderAssignee: currentTeam?.leader ? { id: currentTeam.leader.id, user: currentTeam.leader } : null,
    assignees: formattedAssignees,
    attachments: (t.ticket_attachments || []).map((a) => ({
      id: a.id,
      url: `/tickets/${t.id}/attachments/${a.id}/content`,
      fileName: a.file_name,
      mimeType: a.mime_type,
      size: a.file_size,
      uploadedAt: a.uploaded_at,
      uploadedBy: a.uploaded_by_user
        ? {
            type: "user",
            id: a.uploaded_by_user.id,
            name: a.uploaded_by_user.name,
            username: a.uploaded_by_user.username,
            email: a.uploaded_by_user.username,
          }
        : a.uploaded_by_telegram
        ? {
            type: "telegram",
            id: a.uploaded_by_telegram.id,
            name: a.uploaded_by_telegram.full_name || a.uploaded_by_telegram.username,
            username: a.uploaded_by_telegram.username,
          }
        : null,
    })),
  };
};

/**
 * Generate sequential ticket ID for today: ERR-YYYYMMDD-NNNN
 */
export const generateTicketId = async () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, "0");
  const dd = String(wib.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `ERR-${dateStr}-`;

  const latest = await ticketRepo.findLatestByDatePrefix(prefix);
  let nextSeq = 1;
  if (latest && latest.id) {
    const parts = latest.id.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(4, "0");
  return `${prefix}${seqStr}`;
};
