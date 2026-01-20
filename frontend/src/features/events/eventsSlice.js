import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchMyEvents } from '../dashboard/dashboardSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper to build API URL (handles both with and without /api in base URL)
const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(getApiUrl('/events/'));
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load events');
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await fetch(getApiUrl(`/events/${eventId}`));
      if (!response.ok) {
        throw new Error('Event not found');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load event');
    }
  }
);

export const registerForEvent = createAsyncThunk(
  'events/registerForEvent',
  async ({ eventId, studentId = null }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Please login to register for events');
      }

      if (!eventId) {
        return rejectWithValue('Event ID is required');
      }

      // For parents, always send student_id in body; for students, send empty object
      const body = studentId ? { student_id: studentId } : {};

      const response = await fetch(getApiUrl(`/users/events/${eventId}/register`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
        const errorMessage = errorData.detail || 'Failed to register for event';
        
        // If already registered, treat it as success and return the event ID
        if (response.status === 400 && errorMessage.includes('already registered')) {
          return eventId; // Return event ID so it gets added to registeredEvents
        }
        
        return rejectWithValue(errorMessage);
      }

      const data = await response.json();
      return data.event_id || eventId;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return rejectWithValue('Unable to connect to server. Please check your connection.');
      }
      return rejectWithValue(error.message || 'Failed to register for event');
    }
  }
);

const initialState = {
  events: [],
  currentEvent: null,
  registeredEvents: [],
  loading: false,
  error: null,
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action) => {
      state.events.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload || [];
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEventById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMyEvents.fulfilled, (state, action) => {
        // Extract event IDs from the events array
        state.registeredEvents = action.payload ? action.payload.map(event => event.id) : [];
      })
      .addCase(registerForEvent.fulfilled, (state, action) => {
        // Add event ID to registeredEvents if not already present
        if (action.payload && !state.registeredEvents.includes(action.payload)) {
          state.registeredEvents.push(action.payload);
        }
        // Clear error on successful registration
        state.error = null;
      })
      .addCase(registerForEvent.rejected, (state, action) => {
        // Set error message for failed registration
        state.error = action.payload;
      });
  },
});

export const { addEvent } = eventsSlice.actions;

export default eventsSlice.reducer;
