import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerStudent } from '../authSlice';

const StudentRegisterPage = () => {
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageError, setAgeError] = useState('');
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);

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
    dispatch(registerStudent({ name, email, password }));
  };

  return (
    <div>
      <h2>Student Registration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="age">Age</label>
          <input id="age" type="number" value={age} onChange={handleAgeCheck} required />
          {ageError && <p style={{ color: 'red' }}>{ageError}</p>}
        </div>
        {age >= 14 && (
          <>
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Registering...' : 'Register'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </>
        )}
      </form>
    </div>
  );
};

export default StudentRegisterPage;
