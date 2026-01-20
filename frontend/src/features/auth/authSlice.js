import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper to build API URL (handles both with and without /api in base URL)
const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Helper function to handle fetch errors
const handleFetchError = async (response, defaultMessage) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      return errorData.detail || errorData.message || defaultMessage;
    } catch {
      return defaultMessage;
    }
  }
  return null;
};

// Login with Supabase
export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    const response = await fetch(getApiUrl('/users/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorMessage = await handleFetchError(response, 'Invalid email or password. Please try again.');
      return rejectWithValue(errorMessage);
    }

    const data = await response.json();
    const token = data.access_token;

    // Fetch user profile
    const profileResponse = await fetch(getApiUrl('/users/me'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
        },
        token: token,
      };
    }

    // If profile fetch fails, return basic user info
    return {
      user: {
        email: credentials.email,
        role: 'parent', // Default fallback
      },
      token: token,
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return rejectWithValue('Unable to connect to server. Please check your connection and try again.');
    }
    return rejectWithValue(error.message || 'Login failed. Please try again.');
  }
});

// Register Parent with Supabase
export const registerParent = createAsyncThunk('auth/registerParent', async (userData, { rejectWithValue }) => {
  try {
    const response = await fetch(getApiUrl('/users/register/parent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        full_name: userData.name,
        password: userData.password,
        phone: userData.phone || null,
      }),
    });

    if (!response.ok) {
      const errorMessage = await handleFetchError(response, 'Registration failed. Please check your information and try again.');
      return rejectWithValue(errorMessage);
    }

    const data = await response.json();
    
    // After registration, automatically login
    const loginResponse = await fetch(getApiUrl('/users/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      const token = loginData.access_token;

      // Fetch user profile
      const profileResponse = await fetch(getApiUrl('/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        return {
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.full_name,
            role: profile.role,
          },
          token: token,
        };
      }

      return {
        user: {
          email: userData.email,
          name: userData.name,
          role: 'parent',
        },
        token: token,
      };
    }

    // Registration successful but auto-login failed
    return {
      user: {
        email: userData.email,
        name: userData.name,
        role: 'parent',
      },
      token: null,
      message: data.message || 'Registration successful. Please login.',
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return rejectWithValue('Unable to connect to server. Please check your connection and try again.');
    }
    return rejectWithValue(error.message || 'Registration failed. Please try again.');
  }
});

// Register Student with Supabase
export const registerStudent = createAsyncThunk('auth/registerStudent', async (userData, { rejectWithValue }) => {
  try {
    // Calculate DOB from age
    const today = new Date();
    const birthYear = today.getFullYear() - parseInt(userData.age);
    const dob = `${birthYear}-01-01`; // Approximate DOB

    const response = await fetch(getApiUrl('/users/register/student'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        full_name: userData.name,
        password: userData.password,
        dob: dob,
        school_id: userData.school_id || null,
        class_id: userData.class_id || null,
      }),
    });

    if (!response.ok) {
      const errorMessage = await handleFetchError(response, 'Registration failed. Please check your information and try again.');
      return rejectWithValue(errorMessage);
    }

    const data = await response.json();

    // After registration, automatically login
    const loginResponse = await fetch(getApiUrl('/users/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      const token = loginData.access_token;

      // Fetch user profile
      const profileResponse = await fetch(getApiUrl('/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        return {
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.full_name,
            role: profile.role,
          },
          token: token,
        };
      }

      return {
        user: {
          email: userData.email,
          name: userData.name,
          role: 'student',
        },
        token: token,
      };
    }

    // Registration successful but auto-login failed
    return {
      user: {
        email: userData.email,
        name: userData.name,
        role: 'student',
      },
      token: null,
      message: data.message || 'Registration successful. Please login.',
    };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return rejectWithValue('Unable to connect to server. Please check your connection and try again.');
    }
    return rejectWithValue(error.message || 'Registration failed. Please try again.');
  }
});

// Initialize state from localStorage if available
const getInitialState = () => {
  const token = localStorage.getItem('token');
  return {
    user: null,
    token: token,
    isAuthenticated: !!token,
    status: 'idle',
    error: null,
  };
};

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      // Clear token from localStorage
      localStorage.removeItem('token');
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = !!token;
      if (token) {
        localStorage.setItem('token', token);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        if (action.payload.token) {
          localStorage.setItem('token', action.payload.token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        state.isAuthenticated = false;
      })
      .addCase(registerParent.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerParent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload.token) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          localStorage.setItem('token', action.payload.token);
        }
        state.error = null;
      })
      .addCase(registerParent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(registerStudent.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerStudent.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload.token) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          localStorage.setItem('token', action.payload.token);
        }
        state.error = null;
      })
      .addCase(registerStudent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  },
});

export const { logout, setCredentials, clearError } = authSlice.actions;

export default authSlice.reducer;
