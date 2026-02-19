import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { getApiUrl, getApiHeaders, setTenantSlug, clearStoredTenant } from '../../api/client';

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
      headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorMessage = await handleFetchError(response, 'Invalid email or password. Please try again.');
      return rejectWithValue(errorMessage);
    }

    const data = await response.json();
    const token = data.access_token;

    const profileResponse = await fetch(getApiUrl('/users/me'), {
      headers: getApiHeaders(token),
    });
    const profile = profileResponse.ok ? await profileResponse.json() : null;
    // Super admin: always default to Demo-Circle on login (so it never defaults to BHIS)
    if (profile?.is_super_admin) setTenantSlug('demo-circle');

    const tenantsRes = await fetch(getApiUrl('/tenants/current'), { headers: getApiHeaders(token) });
    let currentTenant = null;
    let allowedSlugs = [];
    if (tenantsRes.ok) {
      const tenantData = await tenantsRes.json();
      allowedSlugs = tenantData.allowed_slugs || [];
      if (profile?.is_super_admin) {
        currentTenant = { slug: 'demo-circle', name: 'Demo-Circle' };
        setTenantSlug('demo-circle');
      } else {
        currentTenant = tenantData.tenant || null;
        if (currentTenant?.slug) setTenantSlug(currentTenant.slug);
      }
    }

    if (profile) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
        },
        token,
        currentTenant,
        allowedTenantSlugs: allowedSlugs,
        profile,
      };
    }
    return {
      user: { email: credentials.email, role: 'parent' },
      token,
      currentTenant,
      allowedTenantSlugs: allowedSlugs,
      profile: null,
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
          profile,
        };
      }

      return {
        user: {
          email: userData.email,
          name: userData.name,
          role: 'parent',
        },
        token: token,
        profile: null,
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
          profile,
        };
      }

      return {
        user: {
          email: userData.email,
          name: userData.name,
          role: 'student',
        },
        token: token,
        profile: null,
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

const BOOTSTRAP_TIMEOUT_MS = 12000; // stop hanging if backend is down/slow so page can load

// Single bootstrap: validate token and load user + tenant. Call once on app load when token exists.
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) return rejectWithValue('no token');
    const headers = getApiHeaders(token);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), BOOTSTRAP_TIMEOUT_MS)
    );
    const fetchPromise = Promise.all([
      fetch(getApiUrl('/users/me'), { headers }),
      fetch(getApiUrl('/tenants/current'), { headers }),
    ]);
    let meRes, tenantsRes;
    try {
      [meRes, tenantsRes] = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      if (err?.message === 'timeout') {
        return rejectWithValue('Server is not responding. Please try again.');
      }
      throw err;
    }
    if (!meRes.ok) {
      return rejectWithValue(meRes.status === 401 ? 'unauthorized' : 'failed');
    }
    const profile = await meRes.json();
    const user = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
    };
    let currentTenant = null;
    let allowedTenantSlugs = [];
    // Super admin: always default to Demo-Circle on every app load (so it never shows BHIS by default)
    if (profile?.is_super_admin) {
      setTenantSlug('demo-circle');
      const res = await fetch(getApiUrl('/tenants/current'), { headers: getApiHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        allowedTenantSlugs = data.allowed_slugs || [];
        currentTenant = { slug: 'demo-circle', name: 'Demo-Circle' };
      }
    } else if (tenantsRes.ok) {
      const data = await tenantsRes.json();
      currentTenant = data.tenant || null;
      allowedTenantSlugs = data.allowed_slugs || [];
      if (profile?.is_super_admin) {
        setTenantSlug('demo-circle');
      } else if (currentTenant?.slug) {
        setTenantSlug(currentTenant.slug);
      }
    }
    return { user, currentTenant, allowedTenantSlugs, profile };
  }
);

// Initialize state from localStorage if available
const getInitialState = () => {
  const token = localStorage.getItem('token');
  return {
    user: null,
    token: token,
    isAuthenticated: !!token,
    status: 'idle',
    error: null,
    currentTenant: null,
    allowedTenantSlugs: [],
    authCheckComplete: !token, // true when no token; when token exists, set true after bootstrap
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
      state.currentTenant = null;
      state.allowedTenantSlugs = [];
      state.authCheckComplete = true;
      localStorage.removeItem('token');
      clearStoredTenant(); // so next visit (and next super admin login) defaults to Demo-Circle
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
    setCurrentTenant: (state, action) => {
      if (action.payload) {
        state.currentTenant = typeof action.payload === 'object'
          ? action.payload
          : { slug: action.payload, name: action.payload };
      }
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
        state.currentTenant = action.payload.currentTenant || null;
        state.allowedTenantSlugs = action.payload.allowedTenantSlugs || [];
        state.authCheckComplete = true;
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
          state.authCheckComplete = true;
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
          state.authCheckComplete = true;
          localStorage.setItem('token', action.payload.token);
        }
        state.error = null;
      })
      .addCase(registerStudent.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.currentTenant = action.payload.currentTenant || null;
        state.allowedTenantSlugs = action.payload.allowedTenantSlugs || [];
        state.authCheckComplete = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.currentTenant = null;
        state.allowedTenantSlugs = [];
        state.authCheckComplete = true;
        // Clear token so next load doesn't retry bootstrap (stops 500 loop when backend/DB is down)
        localStorage.removeItem('token');
      });
  },
});

export const { logout, setCredentials, clearError, setCurrentTenant } = authSlice.actions;

export default authSlice.reducer;
