import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchProfile = createAsyncThunk(
  'dashboard/fetchProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Not authenticated');
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
      const response = await fetch(`${base}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch profile' }));
        return rejectWithValue(errorData.detail || 'Failed to fetch profile');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return rejectWithValue('Unable to connect to server. Please check your connection.');
      }
      return rejectWithValue(error.message || 'Failed to fetch profile');
    }
  }
);

export const fetchMyEvents = createAsyncThunk(
  'dashboard/fetchMyEvents',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Not authenticated');
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
      const response = await fetch(`${base}/users/me/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch events' }));
        return rejectWithValue(errorData.detail || 'Failed to fetch events');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return rejectWithValue('Unable to connect to server. Please check your connection.');
      }
      return rejectWithValue(error.message || 'Failed to fetch events');
    }
  }
);

const initialState = {
  profile: null,
  events: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMyEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchMyEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
