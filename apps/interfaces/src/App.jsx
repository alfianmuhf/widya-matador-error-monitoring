import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import PenggunaWhitelist from "./pages/PenggunaWhitelist.jsx";
import MasterData from "./pages/MasterData.jsx";
import DaftarTiket from "./pages/DaftarTiket.jsx";
import EmptyPage from "./components/common/EmptyPage.jsx";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from "./components/ProtectedRoute.jsx";
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
            {/* Ringkasan — kosong, belum diimplementasi */}
            <Route
              index
              element={
                <EmptyPage
                  icon="📊"
                  label="Ringkasan"
                  description="Dashboard ringkasan sistem aftersales, statistik tiket, dan status bot Telegram akan tampil di sini."
                />
              }
            />

            {/* Analitik Error — kosong */}
            <Route
              path="analitik-error"
              element={
                <EmptyPage
                  icon="🔍"
                  label="Analitik Error"
                  description="Grafik dan analisis error ROS secara rinci termasuk tren dan distribusi kategori akan tampil di sini."
                />
              }
            />

            {/* Menu Daftar Tiket */}
            <Route path="daftar-tiket" element={<DaftarTiket />} />

            {/* Master Data — khusus ADMIN & COORDINATOR */}
            <Route
              path="master-data"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
                  <MasterData />
                </ProtectedRoute>
              }
            />

            {/* Pengguna & Whitelist — hanya untuk admin */}
            <Route
              path="pengguna-whitelist"
              element={
                <AdminRoute>
                  <PenggunaWhitelist />
                </AdminRoute>
              }
            />

            {/* Audit Log — kosong */}
            <Route
              path="audit-log"
              element={
                <EmptyPage
                  icon="📋"
                  label="Audit Log"
                  description="Rekam jejak seluruh aktivitas dan perubahan pada sistem akan tampil di sini."
                />
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
