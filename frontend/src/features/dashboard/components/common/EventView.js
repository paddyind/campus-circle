import React from 'react';

const EventView = ({ events }) => {
  if (!events || events.length === 0) {
    return <p>No upcoming events.</p>;
  }

  return (
    <div>
      <h2>Upcoming Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{event.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default EventView;
