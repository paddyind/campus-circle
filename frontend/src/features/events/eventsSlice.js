import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  events: [],
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action) => {
      state.events.push(action.payload);
    },
  },
});

export const { addEvent } = eventsSlice.actions;

export default eventsSlice.reducer;
