import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { profile, loading, error } = useSelector((state) => state.dashboard);
  const { user } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, events, and system settings</p>
      </div>

      {/* Admin Profile Section */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Admin Profile</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <p className="text-gray-900">{profile?.full_name || user?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{profile?.email || user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-gray-900 capitalize">{profile?.role || user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Manage Users */}
        <Link
          to="/admin/users"
          className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500"
        >
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 ml-4">Manage Users</h3>
          </div>
          <p className="text-gray-600 text-sm">View, edit, and manage all users including parents, students, and organizers.</p>
        </Link>

        {/* Manage Events */}
        <Link
          to="/admin/events"
          className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500"
        >
          <div className="flex items-center mb-4">
            <div className="bg-green-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 ml-4">Manage Events</h3>
          </div>
          <p className="text-gray-600 text-sm">Create, edit, and manage all campus events and registrations.</p>
        </Link>

        {/* Contact Submissions */}
        <Link
          to="/admin/contact-submissions"
          className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500"
        >
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 ml-4">Contact Submissions</h3>
          </div>
          <p className="text-gray-600 text-sm">Review and manage feedback, complaints, and suggestions from users.</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
