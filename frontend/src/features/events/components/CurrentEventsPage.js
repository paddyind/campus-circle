import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchEvents, registerForEvent } from '../eventsSlice';

const CurrentEventsPage = () => {
  const dispatch = useDispatch();
  const { events, registeredEvents, loading, error } = useSelector((state) => state.events);
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const handleRegister = (eventId) => {
    dispatch(registerForEvent(eventId));
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
        <div className="text-center py-12 text-red-600">
          <p>Error loading events: {error}</p>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isRegistered = registeredEvents.includes(event.id);
            return (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{event.description}</p>

                  <div className="flex space-x-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
                    >
                      View Details
                    </Link>
                    {token && (
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
                          className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
                        >
                          Register
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Scheduled</h3>
          <p className="text-gray-600">Check back later for upcoming campus events.</p>
        </div>
      )}
    </div>
  );
};

export default CurrentEventsPage;
