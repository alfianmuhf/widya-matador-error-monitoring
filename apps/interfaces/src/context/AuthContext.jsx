import { createContext, useContext, useState, useEffect } from "react";
import api, { refreshSession } from "../lib/api.js";

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

  const login = async (username, password) => {
    const payload = typeof username === "object"
      ? username
      : { username, email: username, password };
    const res = await api.post("/auth/login", payload);
    const token = res.data?.data?.accessToken;
    const initialUser = res.data?.data?.user;
    if (initialUser) {
      setUser(initialUser);
    }
    if (token) {
      setAccessToken(token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    return initialUser;
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
    let isMounted = true;
    (async () => {
      try {
        const res = await refreshSession();
        const token = res.data?.accessToken;
        const initialUser = res.data?.user;
        if (isMounted) {
          if (initialUser) {
            setUser(initialUser);
          }
          if (token) {
            setAccessToken(token);
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
          }
        }
      } catch {
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateAuthSession = (newToken, updatedUser) => {
    if (newToken) {
      setAccessToken(newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    }
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        fetchMe,
        updateAuthSession,
      }}
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
