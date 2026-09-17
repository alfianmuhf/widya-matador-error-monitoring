import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!accessToken && !!user;

  const fetchMe = async (token) => {
    const res = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = res.data?.data?.user || res.data?.data || null;
    setUser(userData);
    return userData;
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data?.data?.accessToken;
    const initialUser = res.data?.data?.user;
    if (initialUser) {
      setUser(initialUser);
    }
    setAccessToken(token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    try {
      const me = await fetchMe(token);
      return me;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      delete api.defaults.headers.common.Authorization;
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clear state regardless
    }
    setAccessToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        const token = data.data?.accessToken;
        const initialUser = data.data?.user;
        if (initialUser) {
          setUser(initialUser);
        }
        if (token) {
          setAccessToken(token);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          await fetchMe(token);
        }
      } catch {
        // unauthenticated — fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ accessToken, user, loading, isAuthenticated, login, logout, fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
