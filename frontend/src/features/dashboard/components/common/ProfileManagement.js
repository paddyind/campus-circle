import React from 'react';

const ProfileManagement = ({ profile }) => {
  if (!profile) {
    return <p>Loading profile...</p>;
  }

  return (
    <div>
      <h2>Profile Management</h2>
      <p>Name: {profile.name}</p>
      <p>Email: {profile.email}</p>
    </div>
  );
};

export default ProfileManagement;
