/**
 * api.js — Centralized fetch utility with JWT auth support.
 * All API calls that need authentication should use `authFetch`.
 * User data is always sourced from DB (via /auth/me), never from stale localStorage.
 */

export const BASE_URL = 'http://localhost:5002';

// Global variables to deduplicate requests and cache results in-memory
let userCache = null;
let currentFetchPromise = null;

/**
 * Get the stored JWT token.
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Authenticated fetch — automatically attaches Bearer token.
 */
export async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return res;
}

/**
 * Fetch the latest user profile from the database.
 * Optimized with request deduplication and in-memory caching for snappy navigation.
 */
export async function fetchUserFromDB() {
  const token = getToken();
  if (!token) return null;

  // If already fetching, return the existing promise (Deduplication)
  if (currentFetchPromise) return currentFetchPromise;

  currentFetchPromise = (async () => {
    try {
      const res = await authFetch('/auth/me');
      if (res.ok) {
        const user = await res.json();
        // Sync to in-memory cache and localStorage cache
        userCache = user;
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    } catch (err) {
      console.warn('Failed to fetch user from DB:', err);
    } finally {
      currentFetchPromise = null;
    }

    // Fallback logic
    if (userCache) return userCache;
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  })();

  return currentFetchPromise;
}

/**
 * Update user profile in the database (e.g., username).
 * Automatically syncs localStorage after successful update.
 */
export async function updateUserInDB(data) {
  const res = await authFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (res.ok) {
    const updatedUser = await res.json();
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  }
  const err = await res.json().catch(() => ({}));
  throw new Error(err.message || 'Failed to update profile');
}

/**
 * Change password via auth endpoint.
 */
export async function changePasswordInDB(currentPassword, newPassword) {
  const res = await authFetch('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (res.ok) return await res.json();
  const err = await res.json().catch(() => ({}));
  throw new Error(err.message || 'Failed to change password');
}

/**
 * Log a proctoring violation to the database.
 */
export async function logProctoringEvent(sessionId, type, message, severity, round) {
  return authFetch('/analytics/proctoring', {
    method: 'POST',
    body: JSON.stringify({ sessionId, type, message, severity, round }),
  });
}

/**
 * Save the final emotion analysis report to the database.
 */
export async function saveEmotionReport(sessionId, report) {
  return authFetch('/analytics/emotion', {
    method: 'POST',
    body: JSON.stringify({ sessionId, report }),
  });
}

