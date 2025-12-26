import React from 'react';

const RegistrationHistory = ({ events }) => {
  if (!events || events.length === 0) {
    return <p>No registration history.</p>;
  }

  return (
    <div>
      <h2>Registration History</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{event.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default RegistrationHistory;
