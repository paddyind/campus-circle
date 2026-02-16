import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getApiUrl, getApiHeaders } from '../../../api/client';

const emptyEventForm = () => ({
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location: '',
  school_id: '',
  max_registrations: '',
  is_published: true,
  registration_cancellation_cutoff: '',
});

const ManageEvents = () => {
  const { token } = useSelector((state) => state.auth);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schools, setSchools] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regPagination, setRegPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  // Create / Edit event
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  useEffect(() => {
    fetchEvents();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch(getApiUrl('/events/schools/'), {
        headers: getApiHeaders(token),
      });
      if (response.ok) {
        const data = await response.json();
        setSchools(data || []);
      }
    } catch {
      setSchools([]);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiUrl('/events/'), {
        headers: getApiHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch events' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to fetch events`);
      }

      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load events');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRegistrationsModal = (eventId, eventTitle) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setShowModal(true);
    setRegPagination(prev => ({ ...prev, page: 1 }));
    fetchRegistrations(eventId, 1);
  };

  const fetchRegistrations = async (eventId, page) => {
    try {
      setRegLoading(true);
      setRegError(null);
      const offset = (page - 1) * regPagination.limit;
      const response = await fetch(getApiUrl(`/events/${eventId}/registrations?limit=${regPagination.limit}&offset=${offset}`), {
        headers: {
          ...getApiHeaders(token),
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const data = await response.json();
      setRegistrations(data.registrations || []);
      setRegPagination(prev => ({ ...prev, total: data.total, page }));
    } catch (err) {
      setRegError(err.message || 'Failed to load registrations');
    } finally {
      setRegLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchRegistrations(selectedEventId, newPage);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEventId(null);
    setRegistrations([]);
    setRegError(null);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const response = await fetch(getApiUrl(`/events/${eventId}`), {
        method: 'DELETE',
        headers: getApiHeaders(token),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to delete event: ${response.status}`);
      }
      await fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  const openCreateModal = () => {
    setEventForm(emptyEventForm());
    setFormError(null);
    setShowCreateModal(true);
  };

  const defaultCutoffFromStart = (startIso) => {
    if (!startIso) return '';
    const start = new Date(startIso);
    const cutoff = new Date(start.getTime() - 48 * 60 * 60 * 1000);
    return cutoff.toISOString().slice(0, 16);
  };

  const openEditModal = (event) => {
    const start = event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '';
    const end = event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '';
    const cutoffRaw = event.registration_cancellation_cutoff ? new Date(event.registration_cancellation_cutoff).toISOString().slice(0, 16) : '';
    const cutoff = cutoffRaw || defaultCutoffFromStart(event.start_time);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      start_time: start,
      end_time: end,
      location: event.location || '',
      school_id: event.school_id || '',
      max_registrations: event.max_registrations != null ? String(event.max_registrations) : '',
      is_published: event.is_published !== false,
      registration_cancellation_cutoff: cutoff,
    });
    setEditingEventId(event.id);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleEventFormChange = (field, value) => {
    setEventForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'start_time' && value && !prev.registration_cancellation_cutoff) {
        next.registration_cancellation_cutoff = (() => {
          const start = new Date(value);
          const cutoff = new Date(start.getTime() - 48 * 60 * 60 * 1000);
          return cutoff.toISOString().slice(0, 16);
        })();
      }
      return next;
    });
  };

  const buildEventPayload = () => {
    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || null,
      location: eventForm.location.trim() || null,
      school_id: eventForm.school_id || null,
      is_published: eventForm.is_published,
    };
    if (eventForm.start_time) payload.start_time = new Date(eventForm.start_time).toISOString();
    if (eventForm.end_time) payload.end_time = new Date(eventForm.end_time).toISOString();
    const cutoffVal = eventForm.registration_cancellation_cutoff
      ? new Date(eventForm.registration_cancellation_cutoff).toISOString()
      : (eventForm.start_time ? new Date(new Date(eventForm.start_time).getTime() - 48 * 60 * 60 * 1000).toISOString() : null);
    payload.registration_cancellation_cutoff = cutoffVal;
    if (eventForm.max_registrations !== '') {
      const n = parseInt(eventForm.max_registrations, 10);
      if (!isNaN(n)) payload.max_registrations = n;
    }
    return payload;
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const response = await fetch(getApiUrl('/events/'), {
        method: 'POST',
        headers: {
          ...getApiHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildEventPayload()),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create event');
      }
      setShowCreateModal(false);
      fetchEvents();
    } catch (err) {
      setFormError(err.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEventId || !eventForm.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const response = await fetch(getApiUrl(`/events/${editingEventId}`), {
        method: 'PUT',
        headers: {
          ...getApiHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildEventPayload()),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update event');
      }
      setShowEditModal(false);
      setEditingEventId(null);
      fetchEvents();
    } catch (err) {
      setFormError(err.message || 'Failed to update event');
    } finally {
      setFormLoading(false);
    }
  };

  const EventFormFields = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={eventForm.title}
          onChange={(e) => handleEventFormChange('title', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={eventForm.description}
          onChange={(e) => handleEventFormChange('description', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start time *</label>
          <input
            type="datetime-local"
            value={eventForm.start_time}
            onChange={(e) => handleEventFormChange('start_time', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
          <input
            type="datetime-local"
            value={eventForm.end_time}
            onChange={(e) => handleEventFormChange('end_time', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          value={eventForm.location}
          onChange={(e) => handleEventFormChange('location', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
        <select
          value={eventForm.school_id}
          onChange={(e) => handleEventFormChange('school_id', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">— Select —</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max registrations</label>
        <input
          type="number"
          min="0"
          value={eventForm.max_registrations}
          onChange={(e) => handleEventFormChange('max_registrations', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cancel by (optional)</label>
        <input
          type="datetime-local"
          value={eventForm.registration_cancellation_cutoff}
          onChange={(e) => handleEventFormChange('registration_cancellation_cutoff', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">After this time, parents/students cannot cancel registration. Leave empty to use event start time.</p>
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_published"
          checked={eventForm.is_published}
          onChange={(e) => handleEventFormChange('is_published', e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">Published (visible to users)</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); setFormError(null); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={formLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {formLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-600">No events found. Create your first event to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{event.description}</p>
              <div className="space-y-2 mb-4">
                {event.start_time && (
                  <p className="text-sm text-gray-600">
                    <strong>Start:</strong> {new Date(event.start_time).toLocaleString()}
                  </p>
                )}
                {event.location && (
                  <p className="text-sm text-gray-600">
                    <strong>Location:</strong> {event.location}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <p>
                    <strong>Registrations:</strong> {event.current_registrations || 0} / {event.max_registrations || '∞'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/events/${event.id}`}
                  state={{ from: 'manage-events' }}
                  className="flex-1 min-w-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 text-center"
                >
                  View Details
                </Link>
                <button
                  type="button"
                  onClick={() => openEditModal(event)}
                  className="flex-1 min-w-0 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => window.confirm('Delete this event? Registrations will be removed.') && handleDeleteEvent(event.id)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal - content above overlay via relative z-10 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-[101]" onClick={() => setShowCreateModal(false)} aria-hidden="true" />
            <div className="relative z-[102] inline-block bg-white rounded-lg shadow-xl text-left overflow-hidden sm:my-8 sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Event</h3>
                <EventFormFields onSubmit={handleCreateEvent} submitLabel="Create Event" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-[101]" onClick={() => { setShowEditModal(false); setEditingEventId(null); }} aria-hidden="true" />
            <div className="relative z-[102] inline-block bg-white rounded-lg shadow-xl text-left overflow-hidden sm:my-8 sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Event</h3>
                <EventFormFields onSubmit={handleUpdateEvent} submitLabel="Save Changes" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Registrations for {selectedEventTitle}
                    </h3>
                    <div className="mt-4">
                      {regLoading && registrations.length === 0 ? (
                        <div className="text-center py-4">Loading...</div>
                      ) : regError ? (
                        <div className="text-red-500">{regError}</div>
                      ) : registrations.length === 0 ? (
                        <div className="text-gray-500 py-4">No registrations found.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School/Class</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {registrations.map((reg, idx) => (
                                <tr key={idx}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {reg.student_name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {reg.school_name || 'N/A'} - {reg.class_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {reg.parent_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>{reg.parent_email}</div>
                                    <div className="text-xs">{reg.parent_phone}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(reg.registered_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination for Modal */}
                      {Math.ceil(regPagination.total / regPagination.limit) > 1 && (
                        <div className="flex justify-between items-center mt-4">
                          <button
                            onClick={() => handlePageChange(Math.max(regPagination.page - 1, 1))}
                            disabled={regPagination.page === 1}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {regPagination.page} of {Math.ceil(regPagination.total / regPagination.limit)}
                          </span>
                          <button
                            onClick={() => handlePageChange(Math.min(regPagination.page + 1, Math.ceil(regPagination.total / regPagination.limit)))}
                            disabled={regPagination.page === Math.ceil(regPagination.total / regPagination.limit)}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;
