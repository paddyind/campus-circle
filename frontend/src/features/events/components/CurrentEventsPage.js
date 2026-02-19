import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchEvents, registerForEvent } from '../eventsSlice';
import { fetchMyEvents } from '../../dashboard/dashboardSlice';

const CurrentEventsPage = () => {
  const dispatch = useDispatch();
  const { events, registeredEvents, loading, error } = useSelector((state) => state.events);
  const { token, user, currentTenant } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  const isAdmin = user?.role === 'admin' || profile?.role === 'admin';

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch, currentTenant?.slug]);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchMyEvents());
  }, [dispatch, token, currentTenant?.slug]);

  const handleRegister = (eventId) => {
    const isParent = user?.role === 'parent' || profile?.role === 'parent';
    if (isParent) {
      // For parents, they need to select a child, so navigate to event detail page
      // The event detail page will show the child selection modal
      window.location.href = `/events/${eventId}`;
    } else {
      // For students, register directly
      dispatch(registerForEvent({ eventId }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Events</h1>
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading events: {error}</p>
          <button
            type="button"
            onClick={() => dispatch(fetchEvents())}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isRegistered = registeredEvents && registeredEvents.includes(event.id);
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${isRegistered ? 'ring-2 ring-green-500' : ''}`}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{event.description}</p>

                  {/* Date and Duration */}
                  {(event.start_time || event.end_time) && (
                    <div className="mb-3 space-y-1">
                      {event.start_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold">Start: </span>
                          <span>{new Date(event.start_time).toLocaleString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                      {event.end_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold">End: </span>
                          <span>{new Date(event.end_time).toLocaleString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                      {event.start_time && event.end_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold">Duration: </span>
                          <span>{Math.round((new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60))} hours</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(event.max_registrations || event.current_registrations) && (
                    <div className="mb-3 text-sm text-gray-600">
                      <span className="font-semibold">Registrations: </span>
                      {event.current_registrations || 0}
                      {event.max_registrations && ` / ${event.max_registrations}`}
                      {event.max_registrations && event.current_registrations >= event.max_registrations && (
                        <span className="ml-2 text-red-600 font-semibold">(Full)</span>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
                    >
                      View Details
                    </Link>
                    {token && !isAdmin && (
                      isRegistered ? (
                        <Link
                          to="/my-events"
                          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors text-center"
                        >
                          View Registration
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleRegister(event.id)}
                          disabled={event.max_registrations && event.current_registrations >= event.max_registrations}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            event.max_registrations && event.current_registrations >= event.max_registrations
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          {event.max_registrations && event.current_registrations >= event.max_registrations
                            ? 'Event Full'
                            : 'Register'}
                        </button>
                      )
                    )}
                    {!token && (
                      <Link
                        to="/login"
                        className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors text-center"
                      >
                        Register
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Upcoming Events</h3>
                      <p className="text-gray-600 mb-2">There are currently no upcoming events scheduled.</p>
                      <p className="text-gray-500 text-sm mb-6">New events will appear here once they are published by event organizers.</p>
                      {token && (
                        <Link
                          to="/my-events"
                          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          View My Registered Events
                        </Link>
                      )}
                    </div>
                  )}
    </div>
  );
};

export default CurrentEventsPage;
