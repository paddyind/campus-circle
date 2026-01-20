import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, fetchMyEvents } from '../dashboardSlice';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const { profile, events, loading, error } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchMyEvents());
  }, [dispatch]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Dashboard</h1>

      {profile && (
        <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Profile Information</h2>
          <p><strong>Name:</strong> {profile.full_name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Date of Birth:</strong> {profile.dob || 'Not provided'}</p>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Events You're Registered For</h2>
          <Link 
            to="/events" 
            className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
          >
            Browse All Events →
          </Link>
        </div>
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                {event.start_time && (
                  <p className="text-gray-500 text-xs mb-3">
                    {new Date(event.start_time).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
                <Link 
                  to={`/events/${event.id}`} 
                  className="inline-block text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You haven't registered for any events yet.</p>
            <Link 
              to="/events" 
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
