import { API_BASE_URL } from '../config/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.inFlightRequests = new Map();
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

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const config = {
      ...options,
      headers: this.getHeaders(options.headers),
    };

    const response = await fetch(url, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // If token expired, clear invalid session
      if (localStorage.getItem('pm_token')) {
        console.warn('⚠️ API session expired (401). Clearing stale token.');
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
