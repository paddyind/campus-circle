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
const TOKEN_STORAGE_KEY = 'token';

/** When set (tenant-specific deployment), this tenant is used for Help, Events, and API. Otherwise default is demo-circle. */
export const DEPLOYMENT_TENANT_SLUG = process.env.REACT_APP_TENANT_SLUG || null;

/**
 * Current tenant for API, Help page, and Events.
 * - If not logged in (no token): always demo-circle so home/help never show another tenant.
 * - If logged in: use stored tenant or demo-circle.
 */
export const getTenantSlug = () => {
  if (DEPLOYMENT_TENANT_SLUG) return DEPLOYMENT_TENANT_SLUG;
  if (typeof localStorage !== 'undefined' && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
    return 'demo-circle';
  }
  return localStorage.getItem(TENANT_STORAGE_KEY) || 'demo-circle';
};

export const setTenantSlug = (slug) => {
  if (DEPLOYMENT_TENANT_SLUG) return; // tenant locked for this deployment
  if (slug) localStorage.setItem(TENANT_STORAGE_KEY, slug);
};

/** Clear stored tenant so next visit defaults to Demo-Circle (e.g. on logout). */
export const clearStoredTenant = () => {
  localStorage.removeItem(TENANT_STORAGE_KEY);
};

/** Headers for API requests: X-Tenant + Authorization when token provided */
export const getApiHeaders = (token, extra = {}) => {
  const tenant = getTenantSlug();
  const headers = { 'X-Tenant': tenant, ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};
