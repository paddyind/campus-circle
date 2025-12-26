import React from 'react';
import EventView from './common/EventView';
import RegistrationHistory from './common/RegistrationHistory';
import ProfileManagement from './common/ProfileManagement';

const ParentDashboard = () => {
  // TODO: This is a placeholder. The actual dashboard will fetch and display
  // real data for the logged-in parent.
  return (
    <div>
      <h1>Parent Dashboard</h1>
      <EventView />
      <RegistrationHistory />
      <ProfileManagement />
    </div>
  );
};

export default ParentDashboard;
