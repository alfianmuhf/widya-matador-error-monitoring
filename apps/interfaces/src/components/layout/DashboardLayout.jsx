import { Outlet, useLocation } from "react-router-dom";
import { useRef, useEffect } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import ForcedChangePasswordModal from "../auth/ForcedChangePasswordModal.jsx";

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  const currentUser = user?.user || user;
  const isInvitedOrMustChange =
    Boolean(currentUser) &&
    ((currentUser.status || "").toLowerCase() === "invited" ||
      currentUser.must_change_password === true ||
      currentUser.mustChangePassword === true);

  // Otomatis reset scroll ke paling atas setiap rute halaman berganti
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-main)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Modal Paksa Ubah Password untuk user invited / must_change_password */}
      {isInvitedOrMustChange && <ForcedChangePasswordModal user={currentUser} />}

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflowY: "auto",
          filter: isInvitedOrMustChange ? "blur(2px)" : "none",
          pointerEvents: isInvitedOrMustChange ? "none" : "auto",
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
