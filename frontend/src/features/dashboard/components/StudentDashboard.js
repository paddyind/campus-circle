import React from 'react';
import EventView from './common/EventView';
import RegistrationHistory from './common/RegistrationHistory';
import ProfileManagement from './common/ProfileManagement';

const StudentDashboard = () => {
  // TODO: This is a placeholder. The actual dashboard will fetch and display
  // real data for the logged-in student.
  return (
    <div>
      <h1>Student Dashboard</h1>
      <EventView />
      <RegistrationHistory />
      <ProfileManagement />
    </div>
  );
};

export default StudentDashboard;
