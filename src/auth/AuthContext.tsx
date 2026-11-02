import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import type { LoginResponse, Role, User } from "../types";

interface AuthState {
  user: User | null;
  /** True while a stored token is being validated on page load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Registers a new (recruiter) account and logs it in. */
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore the session from a stored token (the server decides if it is still valid).
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const startSession = useCallback(({ access_token, user }: LoginResponse) => {
    tokenStore.set(access_token);
    setUser(user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => startSession(await authApi.login(email, password)),
    [startSession],
  );

  const signup = useCallback(
    async (fullName: string, email: string, password: string) =>
      startSession(await authApi.signup(fullName, email, password)),
    [startSession],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      hasRole: (...roles) => user !== null && roles.includes(user.role),
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
