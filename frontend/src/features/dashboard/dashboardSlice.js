import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  events: [],
  profile: null,
  status: 'idle',
  error: null,
};

const API_BASE_URL = '/api'; // Placeholder for the actual API base URL

export const fetchEvents = createAsyncThunk('dashboard/fetchEvents', async (_, { rejectWithValue }) => {
  if (process.env.REACT_APP_USE_MOCK_API === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, name: 'Parent-Teacher Conference' },
          { id: 2, name: 'School Play' },
          { id: 3, name: 'Science Fair' },
        ]);
      }, 1000);
    });
  } else {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/events`);
      if (!response.ok) {
        throw new Error('Server error!');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
});

export const fetchProfile = createAsyncThunk('dashboard/fetchProfile', async (_, { rejectWithValue }) => {
  if (process.env.REACT_APP_USE_MOCK_API === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ name: 'Test User', email: 'test@example.com' });
      }, 1000);
    });
  } else {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/profile`);
      if (!response.ok) {
        throw new Error('Server error!');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
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
