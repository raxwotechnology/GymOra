import React from "react";
import {
  changePasswordRequest,
  loginRequest,
  requestForgotPasswordOtpRequest,
  resetPasswordWithOtpRequest
} from "../api/authApi";
import { setStoredToken } from "../../../lib/api/client";
import { roleToPath } from "../utils/roleToPath";
import { connectSocket, disconnectSocket } from "../../../lib/socketClient";

const AuthContext = React.createContext(null);
const STORAGE_KEY = "fitnesshub_session";

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: "", rememberMe: false };
    const parsed = JSON.parse(raw);

    if (!parsed?.user?.id || !parsed?.user?.role || !parsed?.user?.email || !parsed?.token) {
      localStorage.removeItem(STORAGE_KEY);
      return { user: null, token: "", rememberMe: false };
    }

    return {
      ...parsed,
      rememberMe: Boolean(parsed?.rememberMe)
    };
  } catch {
    return { user: null, token: "", rememberMe: false };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = React.useState(loadStoredSession);
  const [ready] = React.useState(true);
  const user = session.user;

  // Reconnect socket on page refresh if already logged in
  React.useEffect(() => {
    if (session.token) connectSocket(session.token);
    // Cleanup only runs on true unmount (app teardown) — logout handles disconnect explicitly
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = React.useCallback(async (email, password, rememberMe = false) => {
    try {
      const result = await loginRequest(email, password, rememberMe);
      const nextSession = { user: result.user, token: result.token, rememberMe: Boolean(rememberMe) };
      setSession(nextSession);
      setStoredToken(result.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      connectSocket(result.token);
      return { ok: true, user: result.user };
    } catch (error) {
      return { ok: false, message: error.message || "Invalid email or password" };
    }
  }, []);

  const logout = React.useCallback(() => {
    disconnectSocket();
    setSession({ user: null, token: "", rememberMe: false });
    setStoredToken("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const syncUser = React.useCallback((nextUser) => {
    if (!nextUser) {
      return;
    }

    setSession((current) => {
      const nextSession = { ...current, user: nextUser };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return nextSession;
    });
  }, []);

  const changePassword = React.useCallback(async (payload) => {
    try {
      const result = await changePasswordRequest({ ...payload, rememberMe: Boolean(session.rememberMe) });
      const nextSession = { user: result.user, token: result.token || session.token, rememberMe: Boolean(session.rememberMe) };
      setSession(nextSession);
      setStoredToken(nextSession.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ok: true, user: result.user };
    } catch (error) {
      return { ok: false, message: error.message || "Failed to update password" };
    }
  }, [session.token]);

  const requestForgotPasswordOtp = React.useCallback(async (email) => {
    try {
      const result = await requestForgotPasswordOtpRequest(email);
      return { ok: true, message: result.message };
    } catch (error) {
      return { ok: false, message: error.message || "Failed to send OTP" };
    }
  }, []);

  const resetPasswordWithOtp = React.useCallback(async (payload) => {
    try {
      const result = await resetPasswordWithOtpRequest(payload);
      return { ok: true, message: result.message };
    } catch (error) {
      return { ok: false, message: error.message || "Failed to reset password" };
    }
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      token: session.token,
      login,
      logout,
      syncUser,
      changePassword,
      requestForgotPasswordOtp,
      resetPasswordWithOtp,
      ready
    }),
    [user, session.token, login, logout, syncUser, changePassword, requestForgotPasswordOtp, resetPasswordWithOtp, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export { roleToPath };
