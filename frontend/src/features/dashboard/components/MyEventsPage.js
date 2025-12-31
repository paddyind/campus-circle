import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyEvents } from '../../dashboard/dashboardSlice';
import { Link } from 'react-router-dom';

const MyEventsPage = () => {
  const dispatch = useDispatch();
  const { events, loading, error } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchMyEvents());
  }, [dispatch]);

  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.date) >= now);
  const pastEvents = events.filter(event => new Date(event.date) < now);

  const renderEventList = (eventList) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {eventList.map((event) => (
        <div key={event.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
            <p className="text-gray-600 text-sm mb-3">{event.description}</p>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location}
            </div>
            <Link to={`/events/${event.id}`} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center">
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Events</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? renderEventList(upcomingEvents) : <p>You have no upcoming events.</p>}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Past Events</h2>
        {pastEvents.length > 0 ? renderEventList(pastEvents) : <p>You have no past events.</p>}
      </div>
    </div>
  );
};

export default MyEventsPage;
