import { API_BASE } from '@/constants';
import { ApiResponse, PaginatedResponse } from '@/types';
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

interface ErrorPayload {
  message?: string;
  error?: string;
  errors?: Array<{ code?: string; [key: string]: unknown }>;
  details?: unknown;
  [key: string]: unknown;
}

interface RefreshResponsePayload {
  accessToken: string;
  refreshToken?: string;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => { accessToken = t; },
};

const ACCESS_TOKEN_KEY = 'hp_access';
const REFRESH_TOKEN_KEY = 'hp_refresh';
const LOGIN_PATH = '/login';
const REFRESH_PATH = '/auth/refresh-token';

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const saveTokens = (tokens: RefreshResponsePayload) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  tokenStore.set(tokens.accessToken);
};

const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  tokenStore.set(null);
};

const PUBLIC_ROUTES = [
  '/',
  '/jobs',
  '/internships',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/signup',
  '/employer-login',
  '/employer-signup',
  '/verify-email',
  '/add-email',
  '/forgot-password',
  '/reset-password',
  '/oauth',
];

const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some(route => 
    path === route || (route !== '/' && path.startsWith(`${route}/`))
  );
};

const performLogoutRedirect = () => {
  clearTokens();
  if (typeof window !== 'undefined' && !isPublicRoute(window.location.pathname)) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `${LOGIN_PATH}?redirect=${encodeURIComponent(currentPath)}`;
  }
};

const processRefreshQueue = (error: unknown, token: string | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  refreshQueue = [];
};

const parseRefreshTokens = (payload: unknown): RefreshResponsePayload | null => {
  if (!payload || typeof payload !== 'object') return null;

  const direct = payload as Partial<RefreshResponsePayload>;
  if (typeof direct.accessToken === 'string') {
    return {
      accessToken: direct.accessToken,
      refreshToken: typeof direct.refreshToken === 'string' ? direct.refreshToken : undefined,
    };
  }

  const wrapped = payload as { data?: Partial<RefreshResponsePayload> };
  if (
    wrapped.data &&
    typeof wrapped.data.accessToken === 'string'
  ) {
    return {
      accessToken: wrapped.data.accessToken,
      refreshToken: typeof wrapped.data.refreshToken === 'string' ? wrapped.data.refreshToken : undefined,
    };
  }

  return null;
};

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<ErrorPayload>;
  const status = axiosError.response?.status ?? 0;
  
  if (status === 0 && typeof window !== 'undefined') {
    console.error('[API Network Error] Request failed without a status code. This is typically due to a CORS issue, network connectivity problem, or an invalid API URL.', axiosError);
  }

  const payload = axiosError.response?.data;
  const message =
    payload?.message ||
    payload?.error ||
    axiosError.message ||
    'Request failed';
  const code = payload?.error || payload?.errors?.[0]?.code;

  return new ApiError(message, status, code, payload?.errors, payload?.details, payload);
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
});

const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get() || getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorPayload>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const unauthorizedTransportError =
      !status &&
      (error.code === 'ERR_HTTP2_PROTOCOL_ERROR' ||
        /401|unauthorized/i.test(error.message || '') ||
        /401|unauthorized/i.test(String((error as unknown as { cause?: unknown }).cause || '')));
    const effectiveStatus = status ?? (unauthorizedTransportError ? 401 : undefined);
    const isRefreshCall = originalRequest?.url?.includes(REFRESH_PATH) ?? false;

    if (!originalRequest || effectiveStatus !== 401 || isRefreshCall || originalRequest._retry) {
      if (effectiveStatus === 401 && isRefreshCall) {
        performLogoutRedirect();
      }
      return Promise.reject(toApiError(error));
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      performLogoutRedirect();
      return Promise.reject(toApiError(error));
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((queueError) => Promise.reject(toApiError(queueError)));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await refreshClient.post<ApiResponse<RefreshResponsePayload>>(
        REFRESH_PATH,
        { refreshToken },
      );

      const tokens = parseRefreshTokens(refreshResponse.data);
      if (!tokens) {
        throw new ApiError('Invalid refresh token response', 500, 'INVALID_REFRESH_RESPONSE');
      }

      // Backend may rotate only access token. Preserve existing refresh token when omitted.
      tokens.refreshToken = tokens.refreshToken || getStoredRefreshToken() || undefined;

      saveTokens(tokens);
      processRefreshQueue(null, tokens.accessToken);

      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError, null);
      performLogoutRedirect();
      return Promise.reject(toApiError(refreshError));
    } finally {
      isRefreshing = false;
    }
  },
);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: Array<Record<string, unknown>>,
    public details?: unknown,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: async <T>(path: string, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.get<ApiResponse<T>>(path, config);
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  post: async <T>(path: string, body: unknown, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.post<ApiResponse<T>>(path, body, config);
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  put: async <T>(path: string, body: unknown, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.put<ApiResponse<T>>(path, body, config);
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  patch: async <T>(path: string, body?: unknown, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.patch<ApiResponse<T>>(path, body, config);
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  delete: async <T>(path: string, body?: unknown, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.delete<ApiResponse<T>>(path, { ...config, data: body });
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  getPaginated: async <T>(path: string, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.get<PaginatedResponse<T>>(path, config);
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
  getBlob: async (path: string, config?: AxiosRequestConfig) => {
    try {
      const res = await apiClient.get(path, { ...config, responseType: 'blob' });
      return res.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
