import Header from "../components/layout/Header.jsx";
import { NavLink } from "react-router-dom";

export default function Dashboard() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Header
        title="Ringkasan"
        subtitle="Monitoring status sistem dan ringkasan operasional aftersales"
      />

      <div style={{ padding: "0 32px 32px 32px" }}>
        {/* Quick Overview Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
            }}
          >
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 500 }}>
              Status Bot Aftersales
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-dark)" }}>
                Online
              </span>
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "6px", display: "block" }}>
              Bot Telegram terhubung normal
            </small>
          </div>

          {/* Card 2 */}
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
            }}
          >
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 500 }}>
              Tiket Aktif
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>
                28
              </span>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                tiket terbuka
              </span>
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "6px", display: "block" }}>
              Perlu tindak lanjut teknisi
            </small>
          </div>

          {/* Card 3 */}
          <div
            style={{
              backgroundColor: "var(--surface-card)",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
            }}
          >
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 500 }}>
              Manajemen Akses
            </span>
            <div style={{ marginTop: "10px" }}>
              <NavLink
                to="/pengguna-whitelist"
                style={{
                  color: "var(--primary-teal)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Buka Pengguna & Whitelist &rarr;
              </NavLink>
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "6px", display: "block" }}>
              Kelola user dashboard & whitelist bot
            </small>
          </div>
        </div>

        {/* Informative placeholder card for next branch */}
        <div
          style={{
            backgroundColor: "var(--surface-card)",
            padding: "40px",
            borderRadius: "14px",
            border: "1px solid var(--border-light)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-teal-light)",
              color: "var(--primary-teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
            Selamat Datang di ERAD Dashboard
          </h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "520px", margin: "0 auto 20px auto", fontSize: "var(--text-sm)" }}>
            Tampilan menu <strong>Pengguna & Whitelist</strong> telah selesai diimplementasikan.
            Grafik metrik monitoring ROS dan analitik error akan dibangun di branch <code>feat/ui-dashboard</code>.
          </p>
          <NavLink
            to="/pengguna-whitelist"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              backgroundColor: "var(--primary-teal)",
              color: "#ffffff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
            }}
          >
            Lihat Menu Pengguna & Whitelist
          </NavLink>
        </div>
      </div>
    </div>
  );
}
