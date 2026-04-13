// src/context/AuthContext.jsx
// Provides authentication state and actions to the entire app.
// Usage: const { user, login, logout, isAuthenticated, loading } = useAuth();

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { setAccessToken, clearAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_BASE || '';
const AUTH_REFRESH = `${BASE_URL}/backend/api/auth/refresh.php`;
const AUTH_LOGIN   = `${BASE_URL}/backend/api/auth/login.php`;
const AUTH_LOGOUT  = `${BASE_URL}/backend/api/auth/logout.php`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // { id, name, email }
  const [loading, setLoading] = useState(true);   // true while restoring session on mount

  // ---------------------------------------------------------------------------
  // Try to restore the session on app load by hitting /refresh with cookie.
  // If the refresh cookie is valid, we'll get a new access token silently.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await axios.post(AUTH_REFRESH, {}, { withCredentials: true });
        if (data.success && data.access_token) {
          setAccessToken(data.access_token);
          // Decode user info from access token payload
          const payload = JSON.parse(atob(data.access_token.split('.')[1]));
          setUser({ id: payload.sub, name: payload.name, email: payload.email });
        }
      } catch {
        // No valid session — user needs to log in
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ---------------------------------------------------------------------------
  // login — POST credentials, store token in memory, set user state
  // ---------------------------------------------------------------------------
  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(AUTH_LOGIN, { email, password }, { withCredentials: true });

    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }

    setAccessToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  // ---------------------------------------------------------------------------
  // logout — notify server, clear local state
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      const token = getAccessToken();
      await axios.post(AUTH_LOGOUT, {}, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
