import prisma from "../../config/prisma.js";

export const teamIncludes = {
  leader: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      division: true,
      telegram_user: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
        },
      },
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
          telegram_user: {
            select: {
              id: true,
              telegram_id: true,
              username: true,
              full_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      joined_at: "asc",
    },
  },
  _count: {
    select: {
      members: true,
      primary_tickets: true,
      ticket_teams: true,
    },
  },
};

export const findTeams = async ({ where = {}, skip = 0, take = 50, orderBy = { name: "asc" } } = {}) => {
  return prisma.teams.findMany({
    where,
    include: teamIncludes,
    skip,
    take,
    orderBy,
  });
};

export const countTeams = async (where = {}) => {
  return prisma.teams.count({ where });
};

export const findTeamById = async (id) => {
  return prisma.teams.findUnique({
    where: { id },
    include: teamIncludes,
  });
};

export const findTeamByName = async (name) => {
  return prisma.teams.findUnique({
    where: { name },
    include: teamIncludes,
  });
};

export const createTeam = async (data) => {
  return prisma.teams.create({
    data,
    include: teamIncludes,
  });
};

export const updateTeam = async (id, data) => {
  return prisma.teams.update({
    where: { id },
    data,
    include: teamIncludes,
  });
};

export const deleteTeam = async (id) => {
  return prisma.teams.delete({
    where: { id },
  });
};

export const findTeamMembers = async (teamId) => {
  return prisma.team_members.findMany({
    where: { team_id: teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
          telegram_user: {
            select: {
              id: true,
              telegram_id: true,
              username: true,
              full_name: true,
            },
          },
        },
      },
    },
    orderBy: { joined_at: "asc" },
  });
};

export const findTeamMember = async (teamId, userId) => {
  return prisma.team_members.findUnique({
    where: {
      team_id_user_id: {
        team_id: teamId,
        user_id: userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
        },
      },
    },
  });
};

export const addTeamMember = async (teamId, userId) => {
  return prisma.team_members.create({
    data: {
      team_id: teamId,
      user_id: userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
          telegram_user: {
            select: {
              id: true,
              telegram_id: true,
              username: true,
              full_name: true,
            },
          },
        },
      },
    },
  });
};

export const removeTeamMember = async (teamId, userId) => {
  return prisma.team_members.delete({
    where: {
      team_id_user_id: {
        team_id: teamId,
        user_id: userId,
      },
    },
  });
};

export const findTeamsByUserId = async (userId) => {
  return prisma.teams.findMany({
    where: {
      is_active: true,
      OR: [
        { leader_user_id: userId },
        { members: { some: { user_id: userId } } },
      ],
    },
    include: teamIncludes,
  });
};
