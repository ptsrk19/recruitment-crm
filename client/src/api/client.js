import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors so every caller can just read err.message.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    const message = err.response?.data?.error || err.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// Plain <a href> links can't set an Authorization header, so file links carry
// the token as a query param instead (server accepts either, see auth.js).
export const fileUrl = (id) => `${baseURL}/files/${id}?token=${encodeURIComponent(localStorage.getItem("token") || "")}`;

export default api;
