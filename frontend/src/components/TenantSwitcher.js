import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getApiUrl, getApiHeaders, getTenantSlug, setTenantSlug } from '../api/client';

const displayName = (slug) => {
  if (slug === 'demo-circle') return 'Demo-Circle';
  if (slug === 'demo-bhis') return 'Demo-BHIS';
  return slug || '—';
};

const TenantSwitcher = () => {
  const { token, currentTenant: authTenant, allowedTenantSlugs: authSlugs } = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.dashboard?.profile);
  const [current, setCurrent] = useState(authTenant || { name: getTenantSlug(), slug: getTenantSlug() });
  const [allowed, setAllowed] = useState(authSlugs.length ? authSlugs : []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(!authSlugs.length);

  useEffect(() => {
    if (authTenant) setCurrent(authTenant);
    if (authSlugs.length) {
      setAllowed(authSlugs);
      setLoading(false);
      return;
    }
    if (!token) return;
    let cancelled = false;
    const headers = getApiHeaders(token);
    fetch(getApiUrl('/tenants/current'), { headers })
      .then((res) => (res.ok ? res.json() : { tenant: { name: 'Demo-Circle', slug: 'demo-circle' }, allowed_slugs: ['demo-circle'] }))
      .then((data) => {
        if (cancelled) return;
        setCurrent(data.tenant || { name: 'Demo-Circle', slug: 'demo-circle' });
        setAllowed(data.allowed_slugs || ['demo-circle']);
      })
      .catch(() => {
        if (!cancelled) setAllowed(['demo-circle']);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, authTenant, authSlugs]);

  const handleSelect = (slug) => {
    if (slug === getTenantSlug()) {
      setOpen(false);
      return;
    }
    setTenantSlug(slug);
    setOpen(false);
    window.location.reload();
  };

  // Only super admins can switch tenants; tenant admins manage their single tenant only
  if (!profile?.is_super_admin) return null;
  if (loading || allowed.length <= 1) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-3h2m-6 0h-2m4 0h-2m4 0H7m0 0v-2h14v2" />
        </svg>
        <span className="max-w-[7rem] truncate">{current.name || displayName(current.slug)}</span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl z-20 border border-gray-200 overflow-hidden"
            role="listbox"
          >
            <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch tenant</p>
            </div>
            <ul className="py-1.5">
              {allowed.map((slug) => {
                const isSelected = getTenantSlug() === slug;
                return (
                  <li key={slug} role="option">
                    <button
                      type="button"
                      onClick={() => handleSelect(slug)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m3-3h2m-6 0h-2m4 0h-2m4 0H7m0 0v-2h14v2" />
                          </svg>
                        </span>
                        {displayName(slug)}
                      </span>
                      {isSelected && (
                        <svg className="h-5 w-5 text-indigo-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default TenantSwitcher;
