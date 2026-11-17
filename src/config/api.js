/**
 * API Configuration Helper
 * Automatically uses relative /api/v1 for localhost/dev to leverage Vite proxy
 * and completely eliminate CORS Preflight (204) duplicate rows in the Network tab.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_LOCAL_URL || '/api/v1';

// If configured with localhost or relative path, normalize to '/api/v1' to route through Vite dev proxy
export const API_BASE_URL =
  typeof window !== 'undefined' && (rawBaseUrl.includes('localhost') || !rawBaseUrl.startsWith('http'))
    ? '/api/v1'
    : rawBaseUrl;

export const API_LOCAL_URL = '/api/v1';

export const API_LIVE_URL =
  import.meta.env.VITE_API_LIVE_URL || 'https://api.rentlock.com/api/v1';

export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';

export default {
  API_BASE_URL,
  API_LOCAL_URL,
  API_LIVE_URL,
  APP_ENV,
};
