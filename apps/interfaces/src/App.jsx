import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import PenggunaWhitelist from "./pages/PenggunaWhitelist.jsx";
import MasterData from "./pages/MasterData.jsx";
import DaftarTiket from "./pages/DaftarTiket.jsx";
import ManajemenTiket from "./pages/ManajemenTiket.jsx";
import Ringkasan from "./pages/Ringkasan.jsx";
import AnalitikError from "./pages/AnalitikError.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import ManajemenTim from "./pages/ManajemenTim.jsx";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, CoordinatorRoute } from "./components/ProtectedRoute.jsx";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Routes with Sidebar Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Ringkasan */}
            <Route index element={<Ringkasan />} />

            {/* Analitik Error */}
            <Route path="analitik-error" element={<AnalitikError />} />

            {/* Menu Daftar Tiket */}
            <Route path="daftar-tiket" element={<DaftarTiket />} />

            {/* Menu Manajemen Tiket — COORDINATOR (update & kelola) & ADMIN (kelola akses & tim) */}
            <Route
              path="manajemen-tiket"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
                  <ManajemenTiket />
                </ProtectedRoute>
              }
            />

            {/* Menu Tim RnD — ADMIN & COORDINATOR */}
            <Route
              path="tim"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
                  <ManajemenTim />
                </ProtectedRoute>
              }
            />
            <Route path="teams" element={<Navigate to="/tim" replace />} />

            {/* Master Data — semua role */}
            <Route path="master-data" element={<MasterData />} />

            {/* Pengguna & Whitelist — khusus ADMIN & COORDINATOR (Viewer ditolak) */}
            <Route
              path="pengguna-whitelist"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
                  <PenggunaWhitelist />
                </ProtectedRoute>
              }
            />

            {/* Audit Log — semua role dapat melihat */}
            <Route path="audit-log" element={<AuditLogPage />} />

          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
