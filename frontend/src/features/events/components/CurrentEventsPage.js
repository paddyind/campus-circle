import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addEvent } from '../eventsSlice';

const CurrentEventsPage = () => {
  const dispatch = useDispatch();
  const { events } = useSelector((state) => state.events);

  useEffect(() => {
    // Simulate a real-time feed
    const interval = setInterval(() => {
      const newEvent = {
        id: Date.now(),
        name: `Event at ${new Date().toLocaleTimeString()}`,
      };
      dispatch(addEvent(newEvent));
    }, 5000);

    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div>
      <h1>Current Events</h1>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{event.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default CurrentEventsPage;
