import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://ssssngo-backend-edct.onrender.com/api",
  // Render Free services can need more than 20 seconds to wake from an idle
  // state. Keep the request alive long enough for the first cold request while
  // still retaining a finite timeout for genuinely unavailable services.
  timeout: 60000,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
