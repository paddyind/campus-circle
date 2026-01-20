import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const ChildSelectionModal = ({ isOpen, onClose, onSelect, onAddChild, eventId }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChild, setNewChild] = useState({
    full_name: '',
    dob: '',
    email: '',
    school_id: null,
    class_id: null,
  });
  const [parentEmail, setParentEmail] = useState('');
  const [addingChild, setAddingChild] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChildren();
      // Fetch parent email to use as default
      const fetchParentEmail = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(getApiUrl('/users/me'), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
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
      setNewChild({ full_name: '', dob: '', email: '', school_id: null, class_id: null });
      setParentEmail('');
    }
  }, [isOpen]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users/me/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch children');
      }

      const data = await response.json();
      setChildren(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    setAddingChild(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users/me/children'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChild),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to add child' }));
        throw new Error(errorData.detail || 'Failed to add child');
      }

      const addedChild = await response.json();
      setChildren([...children, addedChild]);
      setShowAddForm(false);
      setNewChild({ full_name: '', dob: '', email: '', school_id: null, class_id: null });
      
      // Auto-select the newly added child
      if (onSelect) {
        onSelect(addedChild.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingChild(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Register a Child for Event</h2>
              <p className="text-sm text-gray-600 mt-1">Select an existing child or add a new one (under 14 years old)</p>
            </div>
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

          {!showAddForm ? (
            <>
              {loading ? (
                <div className="text-center py-8">Loading children...</div>
              ) : children.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-gray-700 mb-2">
                      <strong>No children added yet.</strong>
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      To register a child under 14 for events, you need to add their details first. 
                      Children 14 and older must create their own student accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    + Add a Child (Under 14)
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Child:</h3>
                    <div className="space-y-2">
                      {children.map((child) => {
                        const age = calculateAge(child.dob);
                        return (
                          <button
                            key={child.id}
                            onClick={() => onSelect(child.id)}
                            className="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-500 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">{child.full_name}</p>
                                {age !== null && (
                                  <p className="text-sm text-gray-600">Age: {age} years</p>
                                )}
                                {child.dob && (
                                  <p className="text-sm text-gray-500">
                                    DOB: {new Date(child.dob).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Need to add another child?</strong>
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      You can add children under 14 without creating a login account for them.
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                    >
                      + Add a New Child (Under 14)
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <form onSubmit={handleAddChild} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Child Details (Under 14)</h3>
              
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
                    const minDate = new Date();
                    minDate.setFullYear(minDate.getFullYear() - 14);
                    minDate.setDate(minDate.getDate() + 1); // Add 1 day to ensure "after" 14 years ago
                    return minDate.toISOString().split('T')[0];
                  })()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only children under 14 can be added without a login account. Date must be after {(() => {
                    const minDate = new Date();
                    minDate.setFullYear(minDate.getFullYear() - 14);
                    return minDate.toLocaleDateString();
                  })()}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewChild({ full_name: '', dob: '', school_id: null, class_id: null });
                    setError(null);
                  }}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildSelectionModal;
