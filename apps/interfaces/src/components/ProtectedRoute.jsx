import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const center = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  color: "var(--muted)",
  fontSize: "var(--text-sm)",
};

export function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div style={center}>Memuat...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div style={center}>Memuat...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
