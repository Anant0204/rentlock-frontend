import { API_BASE_URL } from '../config/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.inFlightRequests = new Map();
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = localStorage.getItem('pm_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  onRefreshed(token) {
    this.refreshSubscribers.forEach((cb) => cb(token, null));
    this.refreshSubscribers = [];
  }

  onRefreshFailed(err) {
    this.refreshSubscribers.forEach((cb) => cb(null, err));
    this.refreshSubscribers = [];
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('pm_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshUrl = `${this.baseUrl}/auth/refresh-token`;
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed with HTTP ${response.status}`);
    }

    const json = await response.json().catch(() => ({}));
    const data = json.data || json;
    const newAccessToken = data?.tokens?.accessToken || data?.accessToken;
    const newRefreshToken = data?.tokens?.refreshToken || data?.refreshToken;

    if (!newAccessToken) {
      throw new Error('New access token missing in refresh response');
    }

    localStorage.setItem('pm_token', newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem('pm_refresh_token', newRefreshToken);
    }

    return newAccessToken;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const config = {
      ...options,
      headers: this.getHeaders(options.headers),
    };

    const response = await fetch(url, config);

    // Handle 401 Unauthorized with silent auto-refresh
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh-token');
    if (response.status === 401 && !options._retry && !isAuthEndpoint) {
      options._retry = true;

      const refreshToken = localStorage.getItem('pm_refresh_token');
      if (refreshToken) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const newToken = await this.refreshToken();
            this.isRefreshing = false;
            this.onRefreshed(newToken);
            return this.request(endpoint, options);
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.onRefreshFailed(refreshErr);
            console.warn('⚠️ Session refresh failed, clearing stale session:', refreshErr.message);
            localStorage.removeItem('pm_token');
            localStorage.removeItem('pm_refresh_token');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
          }
        } else {
          // If a refresh is already in progress, queue and retry once resolved
          return new Promise((resolve, reject) => {
            this.refreshSubscribers.push((token, err) => {
              if (err || !token) {
                reject(err || new Error('Session expired'));
              } else {
                resolve(this.request(endpoint, options));
              }
            });
          });
        }
      } else {
        localStorage.removeItem('pm_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = data?.error?.code || 'API_ERROR';
      error.details = data?.error?.details;
      throw error;
    }

    return data.data !== undefined ? data.data : data;
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;

    // Deduplicate in-flight and near-simultaneous GET requests (1.2s window)
    if (this.inFlightRequests.has(fullUrl)) {
      return this.inFlightRequests.get(fullUrl);
    }

    const promise = this.request(fullUrl, { method: 'GET' })
      .then((data) => {
        // Keep deduplication window active for 1.2s to prevent duplicate mounts/re-renders
        setTimeout(() => {
          this.inFlightRequests.delete(fullUrl);
        }, 1200);
        return data;
      })
      .catch((err) => {
        // On error, clear immediately so user can retry
        this.inFlightRequests.delete(fullUrl);
        throw err;
      });

    this.inFlightRequests.set(fullUrl, promise);
    return promise;
  }

  post(endpoint, body = {}) {
    this.inFlightRequests.clear();
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body = {}) {
    this.inFlightRequests.clear();
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body = {}) {
    this.inFlightRequests.clear();
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    this.inFlightRequests.clear();
    return this.request(endpoint, { method: 'DELETE' });
  }

  async checkHealth() {
    try {
      const healthUrl = this.baseUrl.replace(/\/api\/v1\/?$/, '/health');
      const res = await fetch(healthUrl, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
