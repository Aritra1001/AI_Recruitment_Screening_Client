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
  /** Exchanges the ID token from Google's sign-in button for a portal session. */
  google: (credential: string) =>
    apiRequest<LoginResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  me: () =>apiRequest<User>("/auth/me"),
};
