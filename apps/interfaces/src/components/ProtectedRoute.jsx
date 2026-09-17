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

export function ProtectedRoute({ children, allowedRoles }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <div style={center}>Memuat...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    const currentUser = user?.user || user;
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export function AdminRoute({ children }) {
  return <ProtectedRoute allowedRoles={["ADMIN"]}>{children}</ProtectedRoute>;
}

export function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div style={center}>Memuat...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
