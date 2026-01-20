import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AdminMyEventsRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.dashboard);
  const userRole = user?.role || profile?.role;
  
  // Redirect admin users to admin dashboard
  if (userRole === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }
  
  // For non-admin users, this component shouldn't be used
  // This is a safety redirect
  return <Navigate to="/dashboard/parent" replace />;
};

export default AdminMyEventsRedirect;
