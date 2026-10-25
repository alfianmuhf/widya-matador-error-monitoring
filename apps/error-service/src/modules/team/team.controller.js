import * as teamService from "./team.service.js";

export const getTeams = async (req, res, next) => {
  try {
    const result = await teamService.getTeams(req.query);
    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data tim",
      data: result.teams,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Berhasil mengambil detail tim",
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Tim berhasil dibuat",
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const team = await teamService.updateTeam(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Tim berhasil diperbarui",
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const result = await teamService.deleteTeam(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const member = await teamService.addTeamMember(req.params.id, req.body.userId, req.user);
    res.status(201).json({
      success: true,
      message: "Anggota berhasil ditambahkan ke tim",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req, res, next) => {
  try {
    const result = await teamService.removeTeamMember(req.params.id, req.params.userId, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
