import React, { useState, useEffect } from 'react';

const SessionNotifier = () => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Simulate a session alert after 5 seconds
    const timer = setTimeout(() => {
      setNotification('Your session is about to expire.');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!notification) {
    return null;
  }

  return (
    <div className="session-notifier" style={{ color: 'orange', padding: '1em', border: '1px solid orange' }}>
      {notification}
    </div>
  );
};

export default SessionNotifier;
