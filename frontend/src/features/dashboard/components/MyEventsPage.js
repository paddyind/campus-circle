import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyEvents } from '../../dashboard/dashboardSlice';
import { Link } from 'react-router-dom';

const MyEventsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, loading, error } = useSelector((state) => state.dashboard);
  const { user, token } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  
  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Redirect admin users to admin dashboard
    const userRole = user?.role || profile?.role;
    if (userRole === 'admin') {
      navigate('/dashboard/admin', { replace: true });
      return;
    }
    
    // Redirect to login if not authenticated
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    
    dispatch(fetchMyEvents());
  }, [dispatch, token, navigate, user, profile]);
  
  // Check if admin and show loading while redirecting
  const userRole = user?.role || profile?.role;
  if (userRole === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Redirecting to admin dashboard...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter(event => {
    const eventDate = event.start_time ? new Date(event.start_time) : (event.date ? new Date(event.date) : null);
    return eventDate && eventDate >= now;
  });
  const pastEvents = events.filter(event => {
    const eventDate = event.start_time ? new Date(event.start_time) : (event.date ? new Date(event.date) : null);
    return eventDate && eventDate < now;
  });

  const renderEventList = (eventList) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {eventList.map((event) => (
        <div key={event.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
            <p className="text-gray-600 text-sm mb-3">{event.description}</p>
            {(event.start_time || event.date) && (
              <div className="flex items-center text-gray-600 text-sm mb-2">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {(event.start_time ? new Date(event.start_time) : new Date(event.date)).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Registered Events</h1>
        <Link 
          to="/events" 
          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
        >
          Browse All Events →
        </Link>
      </div>
      
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upcoming Events</h2>
            {upcomingEvents.length > 0 ? (
              renderEventList(upcomingEvents)
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">You have no upcoming events.</p>
                <Link 
                  to="/events" 
                  className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Browse Events
                </Link>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Past Events</h2>
            {pastEvents.length > 0 ? (
              renderEventList(pastEvents)
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">You have no past events.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MyEventsPage;
