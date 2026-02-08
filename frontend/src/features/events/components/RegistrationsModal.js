import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEventRegistrations } from '../eventsSlice';

const RegistrationsModal = ({ eventId, eventTitle, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { currentEventRegistrations } = useSelector((state) => state.events);
  const { data: registrations, total, loading, error } = currentEventRegistrations;

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (isOpen && eventId) {
      // Fetch data only if modal is open
      dispatch(fetchEventRegistrations({ eventId, limit, offset: (page - 1) * limit }));
    }
  }, [dispatch, isOpen, eventId, page]);

  useEffect(() => {
    // Reset page when modal opens
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil((total || 0) / limit);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start w-full">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                  Registrations for {eventTitle}
                </h3>

                <div className="mt-2 min-h-[300px]">
                  {loading && registrations.length === 0 ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600 text-center">
                      {typeof error === 'string' ? error : 'Failed to load registrations'}
                    </div>
                  ) : registrations.length === 0 ? (
                    <div className="text-gray-500 py-8 text-center bg-gray-50 rounded">No registrations found.</div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School/Class</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered At</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {registrations.map((reg, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {reg.student_name}
                                  {reg.student_status && reg.student_status !== 'active' && (
                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      {reg.student_status}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="font-medium">{reg.school_name || 'N/A'}</div>
                                  <div className="text-xs">{reg.class_name || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {reg.parent_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div>{reg.parent_email}</div>
                                  <div className="text-xs text-gray-400">{reg.parent_phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(reg.registered_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handlePageChange(Math.max(page - 1, 1))}
                            disabled={page === 1 || loading}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700">
                            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            <span className="ml-2 text-gray-500">({total} total)</span>
                          </span>
                          <button
                            onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
                            disabled={page === totalPages || loading}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationsModal;
