import React, { useState } from 'react';

const StudentRegisterPage = () => {
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageError, setAgeError] = useState('');

  const handleAgeCheck = (e) => {
    const newAge = e.target.value;
    setAge(newAge);
    if (newAge && newAge < 14) {
      setAgeError('Students under 14 must be registered by a parent.');
    } else {
      setAgeError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (age < 14) {
      return;
    }
    // TODO: Implement actual student registration logic, including API calls and state management.
    console.log('Name:', name, 'Email:', email, 'Password:', password);
  };

  return (
    <div>
      <h2>Student Registration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Age</label>
          <input type="number" value={age} onChange={handleAgeCheck} required />
          {ageError && <p style={{ color: 'red' }}>{ageError}</p>}
        </div>
        {age >= 14 && (
          <>
            <div>
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit">Register</button>
          </>
        )}
      </form>
    </div>
  );
};

export default StudentRegisterPage;
