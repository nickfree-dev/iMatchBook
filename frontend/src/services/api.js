// src/services/api.js
// Central Axios instance. All API calls in the app should use this client.
// It automatically:
//   1. Attaches the JWT access token to every request
//   2. On a 401 response, silently refreshes the token and retries the original request
//   3. On refresh failure, clears auth and redirects to /login

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE || '';

// In-memory token store (never localStorage — prevents XSS)
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

// Track ongoing refresh to avoid duplicate refresh calls
let _isRefreshing = false;
let _refreshQueue = []; // Pending requests waiting for a fresh token

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
};

// Main API client
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Required to send/receive the HttpOnly refresh cookie
});

// --- Request interceptor: attach token ---
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  return config;
});

// --- Response interceptor: handle 401 / token refresh ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and only once per request
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/api/auth/')
    ) {
      originalRequest._retried = true;

      if (_isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      _isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/backend/api/auth/refresh.php`,
          {},
          { withCredentials: true }
        );

        if (data.success && data.access_token) {
          setAccessToken(data.access_token);
          processQueue(null, data.access_token);
          originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Redirect to login — use window.location to avoid circular import with router
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
