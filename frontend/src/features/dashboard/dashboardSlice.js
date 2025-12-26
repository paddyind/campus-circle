import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  events: [],
  profile: null,
  status: 'idle',
  error: null,
};

// Mock async thunks for dashboard data
export const fetchEvents = createAsyncThunk('dashboard/fetchEvents', async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: 'Parent-Teacher Conference' },
        { id: 2, name: 'School Play' },
        { id: 3, name: 'Science Fair' },
      ]);
    }, 1000);
  });
});

export const fetchProfile = createAsyncThunk('dashboard/fetchProfile', async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: 'Test User', email: 'test@example.com' });
    }, 1000);
  });
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
