import axios from "axios";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://127.0.0.1:8000";

/** Django admin panel (staff accounts only — same host as the API). */
export const ADMIN_SITE_URL = `${API_ORIGIN.replace(/\/$/, "")}/admin/`;

const api = axios.create({
  baseURL: `${API_ORIGIN.replace(/\/$/, "")}/api/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  const url = config.url || "";
  // Only omit Bearer on unauthenticated auth endpoints — `auth/me/` must receive the JWT.
  const skipAuthHeader =
    url.startsWith("auth/login/") || url.startsWith("auth/register/");

  if (token && !skipAuthHeader) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
