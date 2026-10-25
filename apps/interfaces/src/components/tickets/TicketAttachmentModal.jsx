import Modal from "../common/Modal.jsx";
import TicketAttachments from "./TicketAttachments.jsx";

export default function TicketAttachmentModal({ isOpen, onClose, ticket }) {
  if (!isOpen || !ticket) return null;

  const unitName = ticket.unit || ticket.asset?.unit_code || "Unit Load Scanner";
  const componentName = ticket.component || ticket.failure_code?.component?.name || "-";
  const failureCode = ticket.failureCode || ticket.failure_code?.code || "-";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lampiran Gambar Tiket ${ticket.id}`}
      maxWidth="680px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* TICKET CONTEXT BANNER */}
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <div style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a" }}>
              {unitName} • {componentName} ({failureCode})
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {ticket.damageDescription || ticket.description || "Tidak ada deskripsi kerusakan."}
            </div>
          </div>

          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: (ticket.rawStatus || ticket.status || "").toLowerCase() === "open" ? "#eff6ff" : "#fffbeb",
              color: (ticket.rawStatus || ticket.status || "").toLowerCase() === "open" ? "#2563eb" : "#d97706",
              border: (ticket.rawStatus || ticket.status || "").toLowerCase() === "open" ? "1px solid #bfdbfe" : "1px solid #fde68a",
              textTransform: "uppercase",
            }}
          >
            {ticket.rawStatus || ticket.status || "OPEN"}
          </span>
        </div>

        {/* ATTACHMENT UPLOADER COMPONENT (FULL UPLOAD & MANAGEMENT ALLOWED) */}
        <TicketAttachments ticket={ticket} allowUpload={true} />

        {/* FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: "12px",
            borderTop: "1px solid #edf2f7",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#0e8587",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  );
}
