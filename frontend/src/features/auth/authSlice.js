import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const API_BASE_URL = '/api'; // Placeholder for the actual API base URL

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
  if (process.env.REACT_APP_USE_MOCK_API === 'true') {
    // Simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: { email: credentials.email, name: 'Test User' }, token: 'fake-token' });
      }, 1000);
    });
  } else {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        throw new Error('Server error!');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
});

export const registerParent = createAsyncThunk('auth/registerParent', async (userData, { rejectWithValue }) => {
  if (process.env.REACT_APP_USE_MOCK_API === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: { email: userData.email, name: userData.name }, token: 'fake-token' });
      }, 1000);
    });
  } else {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Server error!');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
});

export const registerStudent = createAsyncThunk('auth/registerStudent', async (userData, { rejectWithValue }) => {
  if (process.env.REACT_APP_USE_MOCK_API === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ user: { email: userData.email, name: userData.name }, token: 'fake-token' });
      }, 1000);
    });
  } else {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Server error!');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(registerParent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerStudent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
