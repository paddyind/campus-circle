import React, { useState, useEffect } from 'react';
import { getApiUrl, getApiHeaders } from '../../../api/client';

const AddChildModal = ({ isOpen, onClose, onSuccess }) => {
  const [newChild, setNewChild] = useState({
    full_name: '',
    dob: '',
    email: '',
    school_id: null,
    class_id: null,
  });
  const [parentEmail, setParentEmail] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch parent email to use as default
      const fetchParentEmail = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(getApiUrl('/users/me'), {
            headers: getApiHeaders(token),
          });
          if (response.ok) {
            const profile = await response.json();
            if (profile.email) {
              setParentEmail(profile.email);
              setNewChild(prev => ({ ...prev, email: profile.email }));
            }
          }
        } catch (err) {
          console.error('Error fetching parent email:', err);
        }
      };
      fetchParentEmail();
    } else {
      // Reset form when modal closes
      setNewChild({ full_name: '', dob: '', email: '', school_id: null, class_id: null });
      setParentEmail('');
      setError(null);
    }
  }, [isOpen]);

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    setAddingChild(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users/me/children'), {
        method: 'POST',
        headers: { ...getApiHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(newChild),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to add child' }));
        throw new Error(errorData.detail || 'Failed to add child');
      }

      const addedChild = await response.json();
      
      if (onSuccess) {
        onSuccess(addedChild);
      }
      
      onClose();
      setNewChild({ full_name: '', dob: '', email: '', school_id: null, class_id: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingChild(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Add a Child (Under 14)</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              Children under 14 can be added without creating a login account. 
              Children 14 and older must create their own student accounts.
            </p>
          </div>

          <form onSubmit={handleAddChild} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newChild.full_name}
                onChange={(e) => setNewChild({ ...newChild, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={newChild.email}
                onChange={(e) => setNewChild({ ...newChild, email: e.target.value })}
                placeholder={parentEmail || "Will use your email by default"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {parentEmail ? `Defaults to: ${parentEmail}` : 'Will use your email by default. You can update this later.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={newChild.dob}
                onChange={(e) => {
                  const dob = e.target.value;
                  setNewChild({ ...newChild, dob });
                  // Check age
                  if (dob) {
                    const age = calculateAge(dob);
                    if (age >= 14) {
                      setError('Children 14 and older must create their own student account');
                    } else if (age < 0) {
                      setError('Date of birth cannot be in the future');
                    } else {
                      setError(null);
                    }
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                min={(() => {
                  // Minimum date: must be born after (today - 14 years)
                  // So min = (today - 14 years + 1 day)
                  const minDate = new Date();
                  minDate.setFullYear(minDate.getFullYear() - 14);
                  minDate.setDate(minDate.getDate() + 1);
                  return minDate.toISOString().split('T')[0];
                })()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Date must be after {(() => {
                  const minDate = new Date();
                  minDate.setFullYear(minDate.getFullYear() - 14);
                  return minDate.toLocaleDateString();
                })()} (child must be under 14)
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingChild || !newChild.full_name || !newChild.dob}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {addingChild ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddChildModal;
