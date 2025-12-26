import React, { useState, useEffect } from 'react';

const CurrentEventsPage = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // TODO: This is a placeholder. The actual implementation will connect to the
    // Supabase Realtime feed to display live event updates.
    const interval = setInterval(() => {
      const newEvent = `Event at ${new Date().toLocaleTimeString()}`;
      setEvents(prevEvents => [...prevEvents, newEvent]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Current Events</h1>
      <ul>
        {events.map((event, index) => (
          <li key={index}>{event}</li>
        ))}
      </ul>
    </div>
  );
};

export default CurrentEventsPage;
