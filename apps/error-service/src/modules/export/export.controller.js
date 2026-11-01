import * as exportService from "./export.service.js";
import * as ticketService from "../ticket/ticket.service.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const getDateSlug = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

/**
 * GET /tickets/export/excel or /exports/excel
 * Stream generated Excel file to client
 */
export const exportTicketsExcel = async (req, res, next) => {
  try {
    const filename = `laporan-tiket-erad-${getDateSlug()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");

    // Initialize streaming Excel writer directly connected to HTTP response
    const writer = exportService.createExcelStreamWriter(res, { user: req.user });

    const query = {
      ...req.query,
      isExport: true,
      onBatch: async (batch) => {
        writer.writeBatch(batch);
      },
    };
    delete query.limit;
    delete query.page;

    const { meta } = await ticketService.getTickets(query);
    await writer.end();

    const exportedCount = writer.getProcessedCount();
    await recordLog({
      actor: req.user?.username || req.user?.name || "User",
      actorUserId: req.user?.id || null,
      action: "EXPORT",
      entityType: "Ticket",
      entityId: filename,
      details: {
        identifier: filename,
        format: "excel",
        totalTickets: exportedCount,
        changeSummary: `ekspor ${exportedCount} tiket ke file Excel '${filename}' (streaming)`,
      },
    });
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      console.error("Error during streaming Excel export:", error);
      res.end();
    }
  }
};

/**
 * GET /tickets/export/pdf or /exports/pdf
 * Stream generated PDF file to client
 */
export const exportTicketsPdf = async (req, res, next) => {
  try {
    const query = {
      ...req.query,
      isExport: true,
    };
    delete query.limit;
    delete query.page;
    const { tickets } = await ticketService.getTickets(query);
    const buffer = await exportService.generateTicketsPdf(tickets, { user: req.user });

    const filename = `laporan-tiket-erad-${getDateSlug()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    await recordLog({
      actor: req.user?.username || req.user?.name || "User",
      actorUserId: req.user?.id || null,
      action: "EXPORT",
      entityType: "Ticket",
      entityId: filename,
      details: {
        identifier: filename,
        format: "pdf",
        totalTickets: tickets.length,
        changeSummary: `ekspor ${tickets.length} tiket ke file PDF '${filename}'`,
      },
    });

    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
