import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../authSlice';

const SessionNotifier = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Warn before typical JWT expiry (e.g. 50 min if token is 1h)
    const timer = setTimeout(() => {
      setNotification('Your session is about to expire.');
      setIsVisible(true);
    }, 50 * 60 * 1000); // 50 minutes
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300);
  };

  const handleLogInAgain = () => {
    setIsVisible(false);
    setNotification(null);
    dispatch(logout());
    navigate('/login', { replace: true, state: { from: 'session_expired' } });
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 opacity-100 translate-y-0">
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-lg p-4 max-w-md w-full mx-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-amber-800">{notification}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogInAgain}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Log in again
              </button>
              <span className="text-amber-600">|</span>
              <button type="button" onClick={handleDismiss} className="text-sm text-amber-700 hover:text-amber-900">
                Dismiss
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button type="button" onClick={handleDismiss} className="inline-flex text-amber-400 hover:text-amber-600 focus:outline-none" aria-label="Dismiss">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionNotifier;
