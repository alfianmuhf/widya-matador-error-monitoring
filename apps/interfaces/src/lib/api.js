import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  withCredentials: true,
});

let refreshPromise = null;

/**
 * Singleton refresh session function.
 * Ensures concurrent requests or React StrictMode share the same in-flight refresh call.
 */
export const refreshSession = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${api.defaults.baseURL}/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      const accessToken = res.data?.data?.accessToken;
      if (accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      }
      return res.data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization && api.defaults.headers.common.Authorization) {
    config.headers.Authorization = api.defaults.headers.common.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (
      !originalRequest ||
      err.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      const data = await refreshSession();
      const accessToken = data.data?.accessToken;
      if (!accessToken) throw new Error("Refresh token missing");

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      delete api.defaults.headers.common.Authorization;
      return Promise.reject(refreshError);
    }
  }
);

export default api;
