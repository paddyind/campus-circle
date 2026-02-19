import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getApiUrl, getApiHeaders } from '../../../api/client';

const ManageTenants = () => {
  const { token } = useSelector((state) => state.auth);
  const [tenants, setTenants] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [settings, setSettings] = useState({});
  const [rawJson, setRawJson] = useState('{}');
  const [jsonError, setJsonError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const res = await fetch(getApiUrl('/admin/tenants'), { headers: getApiHeaders(token) });
        if (!res.ok) throw new Error('Failed to fetch tenants');
        const data = await res.json();
        setTenants(data || []);
        if (data?.length && !selectedSlug) setSelectedSlug(data[0].slug);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, [token, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug || !token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(getApiUrl(`/admin/tenants/${selectedSlug}/settings`), {
          headers: getApiHeaders(token),
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        const next = data.settings || {};
        setSettings(next);
        setRawJson(JSON.stringify(next, null, 2));
        setJsonError(null);
      } catch {
        setSettings({});
        setRawJson('{}');
      }
    };
    fetchSettings();
  }, [selectedSlug, token]);

  const handleJsonChange = (value) => {
    setRawJson(value);
    setSaveSuccess(false);
    try {
      const parsed = JSON.parse(value || '{}');
      setSettings(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e.message || 'Invalid JSON');
    }
  };

  const handleSave = async () => {
    if (jsonError || !selectedSlug || !token) return;
    setSaveLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(getApiUrl(`/admin/tenants/${selectedSlug}/settings`), {
        method: 'PUT',
        headers: { ...getApiHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <span className="ml-3 text-gray-600">Loading tenants...</span>
        </div>
      </div>
    );
  }

  if (error && !tenants.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">{error}</div>
      </div>
    );
  }

  const selectedTenant = tenants.find((t) => t.slug === selectedSlug);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tenant settings</h1>
        <p className="mt-2 text-gray-600">
          As a parent tenant administrator you can review and update settings for any tenant. Switch tenant in the navbar to view that tenant&apos;s data.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Select tenant</h2>
          </div>
          <div className="p-6">
            <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant
            </label>
            <select
              id="tenant-select"
              value={selectedSlug || ''}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="block w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
            {selectedTenant && (
              <p className="mt-2 text-sm text-gray-500">
                Editing settings for <strong>{selectedTenant.name}</strong>. App schema: {selectedTenant.schema_app || '—'}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Settings (JSON)</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-3">
              Optional key-value settings for this tenant. Use valid JSON, e.g. <code className="bg-gray-100 px-1 rounded">{'{"feature_x": true}'}</code>.
            </p>
            <textarea
              value={rawJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={12}
              className={`block w-full rounded-lg border px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                jsonError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder='{}'
              spellCheck={false}
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {jsonError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading || !!jsonError}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveLoading ? 'Saving...' : 'Save settings'}
              </button>
              {saveSuccess && (
                <span className="text-sm font-medium text-green-600">Settings saved.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ManageTenants;
