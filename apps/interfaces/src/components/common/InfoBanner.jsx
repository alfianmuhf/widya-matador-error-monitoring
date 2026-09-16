export default function InfoBanner({ type = "warning", children }) {
  const isWarning = type === "warning";

  const bannerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "var(--text-sm)",
    lineHeight: "1.4",
    marginBottom: "20px",
    background: isWarning ? "var(--banner-yellow-bg)" : "var(--banner-teal-bg)",
    border: `1px solid ${isWarning ? "var(--banner-yellow-border)" : "var(--banner-teal-border)"}`,
    color: isWarning ? "var(--banner-yellow-text)" : "var(--banner-teal-text)",
  };

  return (
    <div style={bannerStyle} role="alert">
      <span style={{ fontSize: "16px", flexShrink: 0, display: "flex", alignItems: "center" }}>
        {isWarning ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8.01" y2="16" />
            <line x1="16" y1="16" x2="16.01" y2="16" />
          </svg>
        )}
      </span>
      <div>{children}</div>
    </div>
  );
}
