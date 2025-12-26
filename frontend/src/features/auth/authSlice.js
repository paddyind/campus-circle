import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Mock async thunks for authentication
export const loginUser = createAsyncThunk('auth/loginUser', async (credentials) => {
  // Simulate an API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ user: { email: credentials.email, name: 'Test User' }, token: 'fake-token' });
    }, 1000);
  });
});

export const registerParent = createAsyncThunk('auth/registerParent', async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ user: { email: userData.email, name: userData.name }, token: 'fake-token' });
    }, 1000);
  });
});

export const registerStudent = createAsyncThunk('auth/registerStudent', async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ user: { email: userData.email, name: userData.name }, token: 'fake-token' });
    }, 1000);
  });
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
