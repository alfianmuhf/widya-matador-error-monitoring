import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { formatDateTimeWIB } from "../ticket/ticket.service.js";

/**
 * Generate formatted Excel buffer for tickets
 * @param {Array} tickets
 * @param {Object} meta
 * @returns {Promise<Buffer>}
 */
export const generateTicketsExcel = async (tickets = [], meta = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ERAD Aftersales";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Rekapitulasi Tiket", {
    views: [{ showGridLines: true }],
  });

  // 1. Title Banner
  sheet.mergeCells("A1:R1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "LAPORAN REKAPITULASI TIKET AFTERSALES — ERAD";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0E7490" }, // Primary Teal
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 36;

  // 2. Metadata Information
  sheet.mergeCells("A2:R2");
  const metaCell = sheet.getCell("A2");
  const printTime = formatDateTimeWIB(new Date());
  metaCell.value = `Tanggal Unduh: ${printTime} WIB | Total Tiket: ${tickets.length} | Sistem: ERAD Load Scanner Aftersales`;
  metaCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 22;

  // Row 3 blank separator
  sheet.getRow(3).height = 10;

  // 3. Table Column Headers
  const headers = [
    { header: "No", key: "no", width: 6 },
    { header: "Ticket ID", key: "id", width: 22 },
    { header: "Unit Code", key: "unit", width: 14 },
    { header: "Tipe", key: "unitType", width: 12 },
    { header: "Client", key: "client", width: 20 },
    { header: "Lokasi", key: "location", width: 18 },
    { header: "Komponen", key: "component", width: 20 },
    { header: "Kode Failure", key: "failureCode", width: 14 },
    { header: "Nama Failure", key: "failureName", width: 22 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Pelapor", key: "reporter", width: 18 },
    { header: "Sumber", key: "source", width: 12 },
    { header: "Kerusakan", key: "description", width: 30 },
    { header: "Penanganan", key: "handling", width: 30 },
    { header: "Penyebab", key: "cause", width: 24 },
    { header: "Tanggal Dibuat", key: "createdDateTimeText", width: 20 },
    { header: "Durasi (MTTR)", key: "durationText", width: 16 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.height = 28;

  headers.forEach((h, idx) => {
    const colIndex = idx + 1;
    const cell = headerRow.getCell(colIndex);
    cell.value = h.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF11222C" }, // Deep Navy
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF0E7490" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
    sheet.getColumn(colIndex).width = h.width;
  });

  // 4. Data Rows
  tickets.forEach((t, index) => {
    const rowIndex = index + 5;
    const row = sheet.getRow(rowIndex);
    row.height = 22;

    const isEven = index % 2 === 1;
    const rowBg = isEven ? "FFF8FAFC" : "FFFFFFFF";

    const values = [
      index + 1,
      t.id || t.ticketId,
      t.unit || t.unitCode,
      t.unitType || "portable",
      t.client || "-",
      t.location || "-",
      t.component || "-",
      t.failureCode || "-",
      t.failureName || "-",
      t.severity || "Rendah",
      t.status || "Open",
      t.reporter || "-",
      t.source || "dashboard",
      t.description || "-",
      t.handling || "-",
      t.cause || "-",
      t.createdDateTimeText || formatDateTimeWIB(t.createdAt),
      t.durationText || "—",
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: "Arial", size: 9 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Alignment tweaks
      if ([1, 2, 3, 4, 8, 10, 11, 13, 17, 18].includes(colIdx + 1)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Format monospace for Ticket ID and Failure Code
      if (colIdx + 1 === 2 || colIdx + 1 === 8) {
        cell.font = { name: "Courier New", size: 9, bold: true };
      }

      // Status Badge Coloring
      if (colIdx + 1 === 11) {
        const st = String(val).toLowerCase();
        if (st === "open") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFDC2626" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        } else if (st === "escalated" || st === "monitor") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFD97706" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
        } else if (st === "solved") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF16A34A" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        } else {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        }
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Generate formatted PDF buffer for tickets (A4 Landscape)
 * @param {Array} tickets
 * @param {Object} meta
 * @returns {Promise<Buffer>}
 */
export const generateTicketsPdf = async (tickets = [], meta = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 (841.89 x 595.28 points)
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
        bufferPages: true,
        info: {
          Title: "Laporan Rekapitulasi Tiket - ERAD",
          Author: "ERAD Aftersales System",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const pageWidth = 841.89 - 60; // 781.89 pt usable

      // 1. Header Banner
      doc.rect(30, 30, pageWidth, 42).fill("#11222c");
      doc
        .fillColor("#ffffff")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("ERAD — ERROR REPORT AUTOMATION DASHBOARD", 45, 38);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#94a3b8")
        .text("Laporan Rekapitulasi Tiket Aftersales Load Scanner", 45, 54);

      const printDateText = formatDateTimeWIB(new Date());
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#e2e8f0")
        .text(`Dicetak: ${printDateText} WIB`, 30, 45, { align: "right", width: pageWidth - 20 });

      let yPos = 82;

      // 2. Summary KPI Cards
      const counts = {
        total: tickets.length,
        open: tickets.filter((t) => (t.status || "").toLowerCase() === "open").length,
        escalated: tickets.filter((t) => ["escalated", "monitor"].includes((t.status || "").toLowerCase())).length,
        solved: tickets.filter((t) => (t.status || "").toLowerCase() === "solved").length,
        closed: tickets.filter((t) => (t.status || "").toLowerCase() === "closed").length,
      };

      const cardWidth = (pageWidth - 40) / 5;
      const kpis = [
        { label: "Total Tiket", value: counts.total, bg: "#f1f5f9", text: "#0f172a" },
        { label: "Status Open", value: counts.open, bg: "#fef2f2", text: "#dc2626" },
        { label: "Status Escalated", value: counts.escalated, bg: "#fffbeb", text: "#d97706" },
        { label: "Status Solved", value: counts.solved, bg: "#f0fdf4", text: "#16a34a" },
        { label: "Status Closed", value: counts.closed, bg: "#f8fafc", text: "#475569" },
      ];

      kpis.forEach((kpi, idx) => {
        const xPos = 30 + idx * (cardWidth + 10);
        doc.roundedRect(xPos, yPos, cardWidth, 40, 6).fill(kpi.bg);
        doc.rect(xPos, yPos, cardWidth, 40).stroke("#cbd5e1");
        doc
          .fillColor("#64748b")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(kpi.label, xPos + 10, yPos + 6);
        doc
          .fillColor(kpi.text)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(String(kpi.value), xPos + 10, yPos + 18);
      });

      yPos += 52;

      // 3. Table Column Layout
      const columns = [
        { title: "No", width: 26, align: "center" },
        { title: "Ticket ID", width: 104, align: "left" },
        { title: "Unit", width: 60, align: "left" },
        { title: "Client / Lokasi", width: 115, align: "left" },
        { title: "Component / Failure", width: 125, align: "left" },
        { title: "Severity", width: 55, align: "center" },
        { title: "Status", width: 65, align: "center" },
        { title: "Tanggal", width: 90, align: "center" },
        { title: "Durasi", width: 50, align: "center" },
        { title: "Pelapor", width: 91, align: "left" },
      ];

      const drawTableHeader = (currY) => {
        doc.rect(30, currY, pageWidth, 22).fill("#0e7490");
        let curX = 30;
        columns.forEach((col) => {
          doc
            .fillColor("#ffffff")
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(col.title, curX + 4, currY + 6, { width: col.width - 8, align: col.align });
          curX += col.width;
        });
        return currY + 22;
      };

      yPos = drawTableHeader(yPos);

      // 4. Render Table Rows
      if (tickets.length === 0) {
        doc.rect(30, yPos, pageWidth, 30).fill("#ffffff").stroke("#e2e8f0");
        doc
          .fillColor("#64748b")
          .fontSize(9)
          .font("Helvetica")
          .text("Tidak ada tiket yang ditemukan.", 30, yPos + 10, { align: "center", width: pageWidth });
      } else {
        const rowHeight = 24;
        tickets.forEach((t, i) => {
          // Check page break
          if (yPos + rowHeight > 535) {
            doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
            yPos = 30;
            yPos = drawTableHeader(yPos);
          }

          const bg = i % 2 === 1 ? "#f8fafc" : "#ffffff";
          doc.rect(30, yPos, pageWidth, rowHeight).fill(bg).stroke("#e2e8f0");

          let curX = 30;
          const rowData = [
            String(i + 1),
            t.id || t.ticketId,
            t.unit || t.unitCode,
            `${t.client || "-"}\n${t.location || "-"}`,
            `${t.component || "-"}\n${t.failureCode || ""}`,
            t.severity || "Rendah",
            t.status || "Open",
            t.createdDateText || "-",
            t.durationText || "—",
            t.reporter || "-",
          ];

          rowData.forEach((val, cIdx) => {
            const col = columns[cIdx];

            // Set color based on status column
            if (cIdx === 6) {
              const st = (val || "").toLowerCase();
              if (st === "open") doc.fillColor("#dc2626");
              else if (st === "escalated" || st === "monitor") doc.fillColor("#d97706");
              else if (st === "solved") doc.fillColor("#16a34a");
              else doc.fillColor("#475569");
              doc.font("Helvetica-Bold");
            } else if (cIdx === 1) {
              doc.fillColor("#0e7490").font("Courier-Bold");
            } else {
              doc.fillColor("#1e293b").font("Helvetica");
            }

            doc
              .fontSize(7.5)
              .text(val, curX + 4, yPos + 5, {
                width: col.width - 8,
                align: col.align,
                lineBreak: false,
                ellipsis: true,
              });

            curX += col.width;
          });

          yPos += rowHeight;
        });
      }

      // Page numbers on all pages
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor("#94a3b8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            `Dokumen dibuat otomatis oleh ERAD System | Halaman ${i + 1} dari ${range.count}`,
            30,
            548,
            { align: "center", width: pageWidth, lineBreak: false }
          );
      }

      doc.flushPages();
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
