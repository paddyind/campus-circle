import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Import CSS - use Tailwind by default, Bootstrap if theme is set
if (process.env.REACT_APP_THEME === 'bootstrap') {
  import('bootstrap/dist/css/bootstrap.min.css');
} else {
  // Import Tailwind CSS
  import('./styles/tailwind.css');
}

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
