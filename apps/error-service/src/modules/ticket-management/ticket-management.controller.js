import * as ticketManagementService from "./ticket-management.service.js";

/**
 * Controller untuk mengambil daftar tiket yang dikelola coordinator
 * GET /ticket-management
 */
export const getManagedTickets = async (req, res, next) => {
  try {
    const result = await ticketManagementService.getManagedTickets(req.user, req.query);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Berhasil mengambil tiket yang dikelola coordinator",
      data: result.tickets,
      meta: result.meta,
      kpi: result.kpi,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk update tiket dari menu manajemen tiket
 * PATCH /ticket-management/:id
 */
export const updateManagedTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await ticketManagementService.updateManagedTicket(id, req.body, req.user);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Tiket ${id} berhasil diperbarui ke versi ${updated.currentVersion ?? (updated.current_version ?? 0)}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk menambah anggota tim software ke tiket
 * POST /ticket-management/:id/assignees
 */
export const addManagedAssignee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await ticketManagementService.addManagedAssignee(id, req.body, req.user);
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk menghapus anggota tim software dari tiket
 * DELETE /ticket-management/:id/assignees/:assigneeId
 */
export const removeManagedAssignee = async (req, res, next) => {
  try {
    const { id, assigneeId } = req.params;
    const result = await ticketManagementService.removeManagedAssignee(id, assigneeId, req.user);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
