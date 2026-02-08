import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

// Mock fetch globally to prevent network errors during tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

test('renders App component without crashing', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );

  // Verify that the app renders properly
  // We use getAllByText because "CampusCircle" appears in the navbar and potentially elsewhere
  const elements = screen.getAllByText(/CampusCircle/i);
  expect(elements.length).toBeGreaterThan(0);
});
