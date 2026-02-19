import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApiUrl, getApiHeaders } from '../../api/client';
import { logout, loginUser, registerParent, registerStudent } from '../auth/authSlice';

export const fetchProfile = createAsyncThunk(
  'dashboard/fetchProfile',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      const response = await fetch(getApiUrl('/users/me'), {
        headers: getApiHeaders(token),
      });

      if (response.status === 401) {
        dispatch(logout());
        return rejectWithValue('Session expired. Please log in again.');
      }
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
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Not authenticated');
      }

      const response = await fetch(getApiUrl('/users/me/events'), {
        headers: getApiHeaders(token),
      });

      if (response.status === 401) {
        dispatch(logout());
        return rejectWithValue('Session expired. Please log in again.');
      }
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
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
  },
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
      })
      .addCase(logout, (state) => {
        state.profile = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        if (action.payload?.profile) state.profile = action.payload.profile;
      })
      .addCase(registerParent.fulfilled, (state, action) => {
        if (action.payload?.profile) state.profile = action.payload.profile;
      })
      .addCase(registerStudent.fulfilled, (state, action) => {
        if (action.payload?.profile) state.profile = action.payload.profile;
      });
  },
});

export const { setProfile, clearProfile } = dashboardSlice.actions;
export default dashboardSlice.reducer;
