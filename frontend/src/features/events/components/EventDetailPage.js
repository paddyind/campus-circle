import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { fetchEventById, registerForEvent } from '../eventsSlice';

const EventDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentEvent, registeredEvents, loading, error } = useSelector((state) => state.events);
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchEventById(id));
  }, [dispatch, id]);

  const handleRegister = () => {
    dispatch(registerForEvent(id));
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (!currentEvent) {
    return <div className="text-center py-12">Event not found.</div>;
  }

  const isRegistered = registeredEvents.includes(currentEvent.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentEvent.title}</h1>
          <p className="text-gray-600 mb-6">{currentEvent.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Schedule</h2>
              <p className="text-gray-600"><strong>Date:</strong> {new Date(currentEvent.date).toLocaleDateString()}</p>
              <p className="text-gray-600"><strong>Time:</strong> {currentEvent.start_time} - {currentEvent.end_time}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Venue</h2>
              <p className="text-gray-600">{currentEvent.location}</p>
            </div>
          </div>

          {token && (
            <div className="mt-8">
              {isRegistered ? (
                <Link to="/my-events" className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors text-center">
                  View Registration
                </Link>
              ) : (
                <button onClick={handleRegister} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                  Register for this Event
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
