import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { StorageService } from './storage';
import { ApiResponse, AuthTokens, User } from '../types/api';

// Create base axios instance
export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// In-memory access token storage
let memoryAccessToken: string | null = null;
let logoutCallback: (() => void) | null = null;

export async function initializeBaseUrl(): Promise<string> {
  try {
    const customUrl = await StorageService.getItem('money_assistant_custom_api_url');
    if (customUrl) {
      api.defaults.baseURL = customUrl;
      return customUrl;
    }
  } catch {
    // fallback
  }
  return api.defaults.baseURL || ENV.API_BASE_URL;
}

export async function setApiBaseUrl(newUrl: string): Promise<string> {
  let cleaned = newUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  if (!cleaned.endsWith('/api/v1')) {
    cleaned = cleaned.replace(/\/+$/, '') + '/api/v1';
  }
  api.defaults.baseURL = cleaned;
  await StorageService.setItem('money_assistant_custom_api_url', cleaned);
  return cleaned;
}

export function getCurrentApiBaseUrl(): string {
  return api.defaults.baseURL || ENV.API_BASE_URL;
}

export async function testServerConnection(url?: string): Promise<{ success: boolean; message: string }> {
  try {
    let target = url ? url.trim() : getCurrentApiBaseUrl();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    if (!target.endsWith('/api/v1')) {
      target = target.replace(/\/+$/, '') + '/api/v1';
    }
    const res = await axios.get(`${target}/health`, { timeout: 6000 });
    if (res.status === 200 && res.data?.success) {
      return { success: true, message: 'Connected to server successfully!' };
    }
    return { success: false, message: `Server replied with status ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { success: false, message: `Could not reach server: ${msg}` };
  }
}

export function setMemoryAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function registerLogoutHandler(callback: () => void) {
  logoutCallback = callback;
}

// Request interceptor: attach bearer access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (memoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${memoryAccessToken}`;
  }
  return config;
});

// Refresh queue management to prevent multiple concurrent refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: handle 401 token rotation
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If the 401 is on the refresh endpoint itself or login/register, don't attempt refresh
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until current refresh finishes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await StorageService.getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh endpoint
        const response = await axios.post<
          ApiResponse<{ user: User; tokens: AuthTokens }>
        >(`${ENV.API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = response.data.data.tokens.accessToken;
        const newRefreshToken = response.data.data.tokens.refreshToken;

        // Update in-memory & secure storage
        setMemoryAccessToken(newAccessToken);
        await Promise.all([
          StorageService.saveAccessToken(newAccessToken),
          StorageService.saveRefreshToken(newRefreshToken),
        ]);

        // Resume queued requests
        processQueue(null, newAccessToken);

        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Only trigger logout if server explicitly rejected with 401 or 403
        if (
          axios.isAxiosError(refreshError) &&
          (refreshError.response?.status === 401 || refreshError.response?.status === 403)
        ) {
          setMemoryAccessToken(null);
          await StorageService.clearAllAuthData();
          if (logoutCallback) {
            logoutCallback();
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Helper for extracting clean error message from Axios errors
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'error' in data) {
      const errObj = (data as { error?: { message?: string } }).error;
      if (errObj?.message) return errObj.message;
    }
    if (error.response?.status === 401) {
      return 'Invalid credentials or session expired.';
    }
    if (error.response?.status === 409) {
      return 'This record or email already exists.';
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
