import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const mockProfile = {
  parent: {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    full_name: 'John Doe',
    email: 'parent@test.com',
    phone: '123-456-7890',
    role: 'parent'
  },
  student: {
    id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
    full_name: 'Jane Doe',
    email: 'student@test.com',
    dob: '2010-05-15',
    role: 'student'
  }
};

export const fetchProfile = createAsyncThunk(
  'dashboard/fetchProfile',
  async (_, { getState }) => {
    const { user } = getState().auth;
    const profile = user?.role === 'parent' ? mockProfile.parent : mockProfile.student;
    return new Promise(resolve => setTimeout(() => resolve(profile), 500));
  }
);

export const fetchMyEvents = createAsyncThunk(
  'dashboard/fetchMyEvents',
  async () => {
    return new Promise(resolve => setTimeout(() => resolve([
      {
        id: '2',
        title: 'Parent-Teacher Conference',
        description: 'Meet with teachers to discuss student progress and academic performance',
        date: '2024-10-01',
        location: 'School Campus',
      }
    ]), 500));
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
