import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { getApiUrl, getApiHeaders } from '../../../api/client';

const ManageUsers = () => {
  const { token, user, currentTenant } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiUrl('/admin/users'), {
        headers: {
          ...getApiHeaders(token),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}: Failed to fetch users` }));
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: Failed to fetch users`;
        console.error('ManageUsers API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
    if (user?.email) {
      setCurrentUserEmail(user.email.toLowerCase());
    } else if (token) {
      fetch(getApiUrl('/users/me'), {
        headers: getApiHeaders(token),
      })
        .then(res => res.json())
        .then(profile => {
          if (profile?.email) {
            setCurrentUserEmail(profile.email.toLowerCase());
          }
        })
        .catch(err => console.error('Error fetching current user:', err));
    }
  }, [token, user, currentTenant?.slug, fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(getApiUrl(`/admin/users/${userId}/role?new_role=${newRole}`), {
        method: 'PUT',
        headers: {
          ...getApiHeaders(token),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Refresh users list
      fetchUsers();
    } catch (err) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  const handleDelete = async (userId, userEmail) => {
    const isSelf = user?.id === userId;
    
    const confirmMessage = isSelf 
      ? '⚠️ WARNING: You are about to delete your own account! This will log you out immediately. Are you absolutely sure?'
      : `Are you sure you want to delete user ${userEmail || userId}?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          ...getApiHeaders(token),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete user' }));
        throw new Error(errorData.detail || 'Failed to delete user');
      }

      // If deleting self, redirect to login
      if (isSelf) {
        window.location.href = '/login';
        return;
      }

      // Refresh users list
      fetchUsers();
    } catch (err) {
      alert(`Error deleting user: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Users</h1>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((userRow) => {
                // Check if this is the current logged-in user by email (most reliable) or ID
                const userRowEmail = userRow.email?.toLowerCase();
                const isCurrentUser = (currentUserEmail && userRowEmail && currentUserEmail === userRowEmail) ||
                                     (user?.email && userRowEmail && user.email.toLowerCase() === userRowEmail) ||
                                     (user?.id && userRow.id && user.id === userRow.id);
                const canDelete = !isCurrentUser;
                
                return (
                  <tr key={userRow.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userRow.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userRow.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userRow.role || 'student'}
                        onChange={(e) => handleRoleChange(userRow.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                        <option value="student">Student</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userRow.created_at ? new Date(userRow.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(userRow.id, userRow.email)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">Current user</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;
