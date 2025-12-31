import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const mockUsers = {
  'parent@test.com': { user: { email: 'parent@test.com', name: 'John Doe', role: 'parent' }, token: 'fake-parent-token' },
  'student@test.com': { user: { email: 'student@test.com', name: 'Jane Doe', role: 'student' }, token: 'fake-student-token' },
};

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockUsers[credentials.email]) {
        resolve(mockUsers[credentials.email]);
      } else {
        reject({ message: 'Invalid credentials' });
      }
    }, 500);
  });
});

export const registerParent = createAsyncThunk('auth/registerParent', async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUser = { user: { email: userData.email, name: userData.name, role: 'parent' }, token: 'fake-parent-token' };
      mockUsers[userData.email] = newUser;
      resolve(newUser);
    }, 500);
  });
});

export const registerStudent = createAsyncThunk('auth/registerStudent', async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newUser = { user: { email: userData.email, name: userData.name, role: 'student' }, token: 'fake-student-token' };
      mockUsers[userData.email] = newUser;
      resolve(newUser);
    }, 500);
  });
});

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

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
