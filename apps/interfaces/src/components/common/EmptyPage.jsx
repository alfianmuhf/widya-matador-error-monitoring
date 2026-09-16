/**
 * EmptyPage — Placeholder untuk halaman yang belum diimplementasikan.
 * Props:
 *  - icon: string (emoji atau teks pendek)
 *  - label: string (nama fitur)
 *  - description: string (keterangan singkat)
 */
export default function EmptyPage({ icon = "🚧", label = "Halaman ini", description = "Fitur ini sedang dalam pengembangan." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "420px",
        padding: "40px",
        textAlign: "center",
      }}
    >
      {/* Illustration ring */}
      <div
        style={{
          width: "88px",
          height: "88px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e8f7fa 0%, #d0eff6 100%)",
          border: "1px solid #b3e2ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem",
          marginBottom: "24px",
          boxShadow: "0 4px 16px rgba(56, 189, 248, 0.12)",
        }}
      >
        {icon}
      </div>

      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--text-dark)",
          marginBottom: "10px",
        }}
      >
        {label} belum tersedia
      </h2>

      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          maxWidth: "380px",
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>

      <div
        style={{
          marginTop: "28px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#f0fafb",
          border: "1px solid #b3e2ef",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--primary-teal)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Akan segera hadir
      </div>
    </div>
  );
}
