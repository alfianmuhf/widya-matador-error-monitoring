import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function DashboardLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-main)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Header dinamis — otomatis sesuai route aktif */}
        <Header />

        {/* Page Content */}
        <div style={{ flex: 1, padding: "0 32px 32px 32px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
