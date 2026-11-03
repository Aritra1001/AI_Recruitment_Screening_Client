import type { LoginResponse, User } from "../types";
import { apiRequest } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (fullName: string, email: string, password: string) =>
    apiRequest<LoginResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, email, password }),
    }),
  me: () => apiRequest<User>("/auth/me"),
};
