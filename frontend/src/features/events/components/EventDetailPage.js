import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchEventById, registerForEvent } from '../eventsSlice';
import { fetchMyEvents, fetchProfile } from '../../dashboard/dashboardSlice';
import ChildSelectionModal from './ChildSelectionModal';
import RegistrationsModal from './RegistrationsModal';

const EventDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentEvent, registeredEvents, loading, error } = useSelector((state) => state.events);
  const { token, user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  const isAdmin = user?.role === 'admin' || profile?.role === 'admin';
  const canViewRegistrations = ['admin', 'event_organizer', 'event_owner'].some(role => role === user?.role || role === profile?.role);
  const isParent = user?.role === 'parent' || profile?.role === 'parent';
  const [showChildModal, setShowChildModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  
  // Determine back link based on where user came from
  const fromManageEvents = location.state?.from === 'manage-events' || location.pathname.includes('/admin');
  const backLink = fromManageEvents ? '/admin/events' : '/events';

  useEffect(() => {
    dispatch(fetchEventById(id));
  }, [dispatch, id]);

  useEffect(() => {
    // Fetch registered events and profile if user is logged in
    if (token) {
      dispatch(fetchMyEvents());
      if (!profile) {
        dispatch(fetchProfile());
      }
    }
  }, [dispatch, token, profile]);

  const handleRegister = () => {
    if (isParent) {
      // For parents, show child selection modal
      setShowChildModal(true);
    } else {
      // For students, register directly
      dispatch(registerForEvent({ eventId: id }));
    }
  };

  const handleChildSelect = (studentId) => {
    if (!id) {
      console.error('Event ID is missing');
      return;
    }
    setShowChildModal(false);
    dispatch(registerForEvent({ eventId: id, studentId }));
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

  const isRegistered = registeredEvents && registeredEvents.includes(currentEvent.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <Link
          to={backLink}
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {fromManageEvents ? 'Back to Manage Events' : 'Back to All Events'}
        </Link>
      </div>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentEvent.title}</h1>
          <p className="text-gray-600 mb-6">{currentEvent.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Schedule</h2>
              {currentEvent.start_time ? (
                <>
                  <p className="text-gray-600"><strong>Date:</strong> {new Date(currentEvent.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-gray-600"><strong>Time:</strong> {new Date(currentEvent.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {currentEvent.end_time ? new Date(currentEvent.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</p>
                </>
              ) : currentEvent.date ? (
                <>
                  <p className="text-gray-600"><strong>Date:</strong> {new Date(currentEvent.date).toLocaleDateString()}</p>
                  <p className="text-gray-600"><strong>Time:</strong> {currentEvent.start_time || 'TBD'} - {currentEvent.end_time || 'TBD'}</p>
                </>
              ) : (
                <p className="text-gray-600">Date and time to be announced</p>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Venue</h2>
              <p className="text-gray-600">{currentEvent.location}</p>
            </div>
          </div>

          {(currentEvent.max_registrations || currentEvent.current_registrations) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Registration Status</h2>
                  <p className="text-gray-600">
                    <strong>Registered:</strong> {currentEvent.current_registrations || 0}
                    {currentEvent.max_registrations && (
                      <>
                        {' / '}
                        <strong>{currentEvent.max_registrations}</strong>
                        {' spots available'}
                        {currentEvent.current_registrations >= currentEvent.max_registrations && (
                          <span className="ml-2 text-red-600 font-semibold">(Event Full)</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                {canViewRegistrations && (
                  <button
                    onClick={() => setShowRegistrationsModal(true)}
                    className="mt-1 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition-colors"
                  >
                    View Registered Members
                  </button>
                )}
              </div>
            </div>
          )}

          {token && !isAdmin && (
            <div className="mt-8">
              {isRegistered ? (
                <Link to="/my-events" className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors text-center">
                  View Registration
                </Link>
              ) : (
                <button 
                  onClick={handleRegister}
                  disabled={currentEvent.max_registrations && currentEvent.current_registrations >= currentEvent.max_registrations}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                    currentEvent.max_registrations && currentEvent.current_registrations >= currentEvent.max_registrations
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {currentEvent.max_registrations && currentEvent.current_registrations >= currentEvent.max_registrations
                    ? 'Event Full - Registration Closed'
                    : isParent
                    ? 'Register a Child for this Event'
                    : 'Register for this Event'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showChildModal && (
        <ChildSelectionModal
          isOpen={showChildModal}
          onClose={() => setShowChildModal(false)}
          onSelect={handleChildSelect}
          eventId={id}
        />
      )}

      {showRegistrationsModal && (
        <RegistrationsModal
          eventId={id}
          eventTitle={currentEvent.title}
          isOpen={showRegistrationsModal}
          onClose={() => setShowRegistrationsModal(false)}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
