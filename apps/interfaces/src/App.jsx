import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.jsx";
import "./App.css";

function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Halo, {user?.name || user?.email}</h1>
        <p className="dashboard-role">Role: {user?.role || "-"}</p>
        <button type="button" onClick={handleLogout} className="dashboard-logout">
          Logout
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
