import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const ManageEvents = () => {
  const { token } = useSelector((state) => state.auth);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiUrl('/events/'), {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
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
          'Authorization': `Bearer ${token}`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
        <button 
          onClick={() => alert('Create Event functionality coming soon')}
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
                  {(event.current_registrations || 0) > 0 && (
                    <button
                      onClick={() => openRegistrationsModal(event.id, event.title)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                    >
                      View List
                    </button>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Link
                  to={`/events/${event.id}`}
                  state={{ from: 'manage-events' }}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 text-center"
                >
                  View Details
                </Link>
                <button 
                  onClick={() => alert('Edit functionality coming soon')}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
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
