import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<h1>Welcome to CampusCircle</h1>} />
          {/* Add other routes here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
