import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getApiUrl, getApiHeaders, getTenantSlug } from '../../../api/client';
import { fetchProfile } from '../../dashboard/dashboardSlice';
import EditProfileModal from './EditProfileModal';
import AddChildModal from './AddChildModal';

const tenantDisplayName = (slug) => {
  if (slug === 'demo-circle') return 'Demo-Circle';
  if (slug === 'demo-bhis') return 'Demo-BHIS';
  return slug || '—';
};

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector((state) => state.dashboard);
  const { user, token } = useSelector((state) => state.auth);
  const [children, setChildren] = useState([]);
  const [parent, setParent] = useState(null);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      dispatch(fetchProfile());
    }
  }, [dispatch, token]);

  const fetchRelationships = useCallback(async () => {
    if (!token || !user) return;
    
    setLoadingRelations(true);
    try {
      if (user?.role === 'parent') {
        const response = await fetch(getApiUrl('/users/me/children'), {
          headers: getApiHeaders(token),
        });
        if (response.ok) {
          const data = await response.json();
          setChildren(data || []);
        }
      } else if (user?.role === 'student') {
        const response = await fetch(getApiUrl('/users/me/parent'), {
          headers: getApiHeaders(token),
        });
        if (response.ok) {
          const data = await response.json();
          setParent(data);
        }
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    } finally {
      setLoadingRelations(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      fetchRelationships();
    }
  }, [token, user, fetchRelationships]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account information and relationships</p>
      </div>

      {/* User Profile Section */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
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
            {profile?.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{profile.phone}</p>
              </div>
            )}
            {profile?.dob && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <p className="text-gray-900">{new Date(profile.dob).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="text-gray-900 capitalize">{profile?.role || user?.role || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current tenant</label>
              <p className="text-gray-900">{tenantDisplayName(getTenantSlug())}</p>
              <p className="text-xs text-gray-500 mt-1">Switch tenant in the navbar to change context.</p>
            </div>
          </div>
          <div className="mt-6">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Parent-Student Relationships */}
      {user?.role === 'parent' && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">My Children</h2>
            <button
              onClick={() => setIsAddChildModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Add Child (Under 14)
            </button>
          </div>
          <div className="p-6">
            {loadingRelations ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading children...</p>
              </div>
            ) : children.length > 0 ? (
              <div className="space-y-4">
                {children.map((child) => (
                  <div key={child.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">{child.full_name}</h3>
                      <p className="text-sm text-gray-600">{child.email || 'No email'}</p>
                      {child.dob && (
                        <p className="text-sm text-gray-600">
                          DOB: {new Date(child.dob).toLocaleDateString()}
                        </p>
                      )}
                      {child.status && (
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                          child.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {child.status}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-700 text-sm font-semibold">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No children registered yet.</p>
                <button
                  onClick={() => setIsAddChildModalOpen(true)}
                  className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add Your First Child (Under 14)
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  Children 14 and older must create their own student accounts at{' '}
                  <Link to="/register/student" className="text-indigo-600 hover:underline">
                    Register as Student
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {user?.role === 'student' && parent && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Parent Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                <p className="text-gray-900">{parent.full_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                <p className="text-gray-900">{parent.email || 'N/A'}</p>
              </div>
              {parent.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                  <p className="text-gray-900">{parent.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
      />
      
      {user?.role === 'parent' && (
        <AddChildModal
          isOpen={isAddChildModalOpen}
          onClose={() => setIsAddChildModalOpen(false)}
          onSuccess={(newChild) => {
            // Refresh children list
            fetchRelationships();
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
