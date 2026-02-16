/**
 * Shared API base URL and headers. Always sends X-Tenant (from localStorage, default demo-circle).
 * Use getApiHeaders(token) for authenticated requests so backend resolves tenant correctly.
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const TENANT_STORAGE_KEY = 'tenant';

export const getTenantSlug = () => {
  return localStorage.getItem(TENANT_STORAGE_KEY) || 'demo-circle';
};

export const setTenantSlug = (slug) => {
  if (slug) localStorage.setItem(TENANT_STORAGE_KEY, slug);
};

/** Headers for API requests: X-Tenant + Authorization when token provided */
export const getApiHeaders = (token, extra = {}) => {
  const tenant = getTenantSlug();
  const headers = { 'X-Tenant': tenant, ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};
