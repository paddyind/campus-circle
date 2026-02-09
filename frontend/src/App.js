import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoginPage from './features/auth/components/LoginPage';
import ParentRegisterPage from './features/auth/components/ParentRegisterPage';
import StudentRegisterPage from './features/auth/components/StudentRegisterPage';
import ParentDashboard from './features/dashboard/components/ParentDashboard';
import StudentDashboard from './features/dashboard/components/StudentDashboard';
import AdminDashboard from './features/dashboard/components/AdminDashboard';
import MyEventsPage from './features/dashboard/components/MyEventsPage';
import CurrentEventsPage from './features/events/components/CurrentEventsPage';
import EventDetailPage from './features/events/components/EventDetailPage';
import ProfilePage from './features/profile/components/ProfilePage';
import SessionNotifier from './features/auth/components/SessionNotifier';
import HelpPage from './features/auth/components/HelpPage';
import ContactPage from './features/contact/components/ContactPage';
import AboutPage from './components/AboutPage';
import ManageUsers from './features/admin/components/ManageUsers';
import ManageEvents from './features/admin/components/ManageEvents';
import ManageSchools from './features/admin/components/ManageSchools';
import ContactSubmissions from './features/admin/components/ContactSubmissions';
import { fetchEvents } from './features/events/eventsSlice';
import { setCredentials, logout } from './features/auth/authSlice';
import { fetchProfile } from './features/dashboard/dashboardSlice';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  return token ? children : <Navigate to="/login" replace />;
};

function HomePage() {
  const dispatch = useDispatch();
  const { events, loading } = useSelector((state) => state.events);
  const { token, user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  const isAdmin = user?.role === 'admin' || profile?.role === 'admin';

  useEffect(() => {
    if (token && !profile) {
      dispatch(fetchProfile());
    }
  }, [token, profile, dispatch]);

  useEffect(() => {
    if (events.length === 0) {
      dispatch(fetchEvents());
    }
  }, [dispatch, events.length]);

  // Only use real events from API, no mock events
  const currentEvents = events;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center py-12 sm:py-16 lg:py-20">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">CampusCircle</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-10 px-4">
          Your comprehensive platform for campus events, seamless parent-student communication, and enhanced campus engagement.
        </p>
      </div>

      {/* Events Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {loading ? 'Loading Events...' : currentEvents.length > 0 ? 'Current & Upcoming Events' : 'No Events Scheduled'}
          </h2>
          {currentEvents.length > 0 && (
            <Link
              to="/events"
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
            >
              View All Events →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : currentEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'current' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {event.status === 'current' ? 'Current' : 'Upcoming'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {event.start_time ? (
                        new Date(event.start_time).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      ) : event.date ? (
                        new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      ) : 'Date TBD'}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
                    >
                      View Details
                    </Link>
                    {token && !isAdmin && (
                      <Link
                        to={`/events/${event.id}`}
                        className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors text-center"
                      >
                        Register
                      </Link>
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
            ))}
          </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Upcoming Events</h3>
                        <p className="text-gray-600 mb-2">There are currently no upcoming events scheduled.</p>
                        <p className="text-gray-500 text-sm mb-6">New events will appear here once they are published by event organizers.</p>
                        <Link
                          to="/events"
                          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          View All Events
                        </Link>
                      </div>
                    )}
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  // Validate stored token on load: if we have token but no user, verify with API; clear token if invalid
  const { user } = useSelector((state) => state.auth);
  useEffect(() => {
    if (!token) return;
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    fetch(`${base}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((response) => {
        if (response.ok) return response.json();
        dispatch(logout());
        return null;
      })
      .then((profile) => {
        if (profile) {
          dispatch(setCredentials({
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.full_name,
              role: profile.role,
            },
            token,
          }));
        }
      })
      .catch(() => dispatch(logout()));
  }, [dispatch, token]);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <SessionNotifier />
        <main className="flex-1 w-full flex flex-col">
        <Routes>
            <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/parent" element={<ParentRegisterPage />} />
          <Route path="/register/student" element={<StudentRegisterPage />} />
          <Route 
            path="/dashboard/parent" 
            element={
              <ProtectedRoute>
                <ParentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student" 
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-events" 
            element={
              <ProtectedRoute>
                <MyEventsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route path="/events" element={<CurrentEventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route 
            path="/contact" 
            element={
              <ProtectedRoute>
                <ContactPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <ManageUsers />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/admin/schools"
            element={
              <ProtectedRoute>
                <ManageSchools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute>
                <ManageEvents />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/admin/contact-submissions"
            element={
              <ProtectedRoute>
                <ContactSubmissions />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full"><h1 className="text-3xl font-bold mb-4">Privacy Policy</h1><p className="text-gray-600">Our privacy policy and data protection practices.</p></div>} />
          <Route path="/security" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full"><h1 className="text-3xl font-bold mb-4">Security</h1><p className="text-gray-600">Information about our security measures.</p></div>} />
          <Route path="/terms" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full"><h1 className="text-3xl font-bold mb-4">Terms of Service</h1><p className="text-gray-600">Terms and conditions for using CampusCircle.</p></div>} />
        </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
