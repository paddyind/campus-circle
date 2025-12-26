import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, fetchProfile } from '../dashboardSlice';
import EventView from './common/EventView';
import RegistrationHistory from './common/RegistrationHistory';
import ProfileManagement from './common/ProfileManagement';

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const { events, profile, status } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchEvents());
    dispatch(fetchProfile());
  }, [dispatch]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Student Dashboard</h1>
      <ProfileManagement profile={profile} />
      <EventView events={events} />
      <RegistrationHistory events={events} />
    </div>
  );
};

export default StudentDashboard;
