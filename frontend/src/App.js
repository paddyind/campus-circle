import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './features/auth/components/LoginPage';
import ParentRegisterPage from './features/auth/components/ParentRegisterPage';
import StudentRegisterPage from './features/auth/components/StudentRegisterPage';
import ParentDashboard from './features/dashboard/components/ParentDashboard';
import StudentDashboard from './features/dashboard/components/StudentDashboard';
import CurrentEventsPage from './features/events/components/CurrentEventsPage';
import SessionNotifier from './features/auth/components/SessionNotifier';

function App() {
  return (
    <Router>
      <div className="App">
        <SessionNotifier />
        <Routes>
          <Route path="/" element={<h1>Welcome to CampusCircle</h1>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/parent" element={<ParentRegisterPage />} />
          <Route path="/register/student" element={<StudentRegisterPage />} />
          <Route path="/dashboard/parent" element={<ParentDashboard />} />
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/events/current" element={<CurrentEventsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
