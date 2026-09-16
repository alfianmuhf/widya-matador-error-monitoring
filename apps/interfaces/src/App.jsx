import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PenggunaWhitelist from "./pages/PenggunaWhitelist.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.jsx";
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
            {/* Index: Ringkasan (Dashboard) */}
            <Route index element={<Dashboard />} />

            {/* Menu Pengguna & Whitelist */}
            <Route path="pengguna-whitelist" element={<PenggunaWhitelist />} />

            {/* Placeholders for other sidebar menus */}
            <Route path="analitik-error" element={<Dashboard />} />
            <Route path="daftar-tiket" element={<Dashboard />} />
            <Route path="master-data" element={<Dashboard />} />
            <Route path="audit-log" element={<Dashboard />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
