import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import PenggunaWhitelist from "./pages/PenggunaWhitelist.jsx";
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

            {/* Daftar Tiket — kosong */}
            <Route
              path="daftar-tiket"
              element={
                <EmptyPage
                  icon="🎫"
                  label="Daftar Tiket"
                  description="Daftar tiket aftersales yang masuk melalui bot Telegram beserta status penanganannya akan tampil di sini."
                />
              }
            />

            {/* Master Data — kosong */}
            <Route
              path="master-data"
              element={
                <EmptyPage
                  icon="🗄️"
                  label="Master Data"
                  description="Pengelolaan data referensi dan konfigurasi sistem akan tampil di sini."
                />
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
