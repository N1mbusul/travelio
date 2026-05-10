import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
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
