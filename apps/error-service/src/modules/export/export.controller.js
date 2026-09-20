import * as exportService from "./export.service.js";
import * as ticketService from "../ticket/ticket.service.js";

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
    // Fetch all matching tickets without low pagination limit
    const query = {
      ...req.query,
      limit: 5000,
      page: 1,
    };
    const { tickets } = await ticketService.getTickets(query);
    const buffer = await exportService.generateTicketsExcel(tickets, { user: req.user });

    const filename = `laporan-tiket-erad-${getDateSlug()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
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
      limit: 5000,
      page: 1,
    };
    const { tickets } = await ticketService.getTickets(query);
    const buffer = await exportService.generateTicketsPdf(tickets, { user: req.user });

    const filename = `laporan-tiket-erad-${getDateSlug()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
