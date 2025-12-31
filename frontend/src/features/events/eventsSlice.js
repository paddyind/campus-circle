import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchMyEvents } from '../dashboard/dashboardSlice';

const mockEvents = [
  {
    id: '1',
    title: 'Annual Science Fair',
    description: 'Showcase of student science projects and innovations',
    date: '2024-09-15',
    start_time: '10:00',
    end_time: '14:00',
    location: 'Main Auditorium',
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Parent-Teacher Conference',
    description: 'Meet with teachers to discuss student progress and academic performance',
    date: '2024-10-01',
    start_time: '08:00',
    end_time: '17:00',
    location: 'School Campus',
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'Sports Day',
    description: 'Annual inter-house sports competition',
    date: '2024-08-25',
    start_time: '09:00',
    end_time: '16:00',
    location: 'Sports Ground',
    status: 'past'
  }
];

export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async () => {
    return new Promise(resolve => setTimeout(() => resolve(mockEvents), 500));
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId) => {
    const event = mockEvents.find(e => e.id === eventId);
    return new Promise(resolve => setTimeout(() => resolve(event), 500));
  }
);

export const registerForEvent = createAsyncThunk(
  'events/registerForEvent',
  async (eventId) => {
    return new Promise(resolve => setTimeout(() => resolve(eventId), 500));
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
        state.registeredEvents = ['2'];
      })
      .addCase(registerForEvent.fulfilled, (state, action) => {
        state.registeredEvents.push(action.payload);
      });
  },
});

export const { addEvent } = eventsSlice.actions;

export default eventsSlice.reducer;
