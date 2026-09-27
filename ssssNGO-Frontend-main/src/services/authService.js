import API from "./api";

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const requestPasswordReset = (email) => API.post("/auth/forgot-password", { email });
export const resetPassword = (data) => API.post("/auth/reset-password", data);
export const recoverLoginId = (email) => API.post("/auth/forgot-login-id", { email });
