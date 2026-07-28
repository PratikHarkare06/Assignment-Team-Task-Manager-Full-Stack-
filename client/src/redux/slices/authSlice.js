import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  auth,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '../../services/firebase';
import api from '../../services/api';

// ─── Helper: exchange Firebase token for app JWT ───────────────────────────
async function firebaseExchange(firebaseUser, name = '', role = 'member') {
  const firebaseToken = await firebaseUser.getIdToken();
  const res = await api.post('/auth/firebase', { firebaseToken, name, role });
  localStorage.setItem('token', res.data.token);
  return res.data; // { success, token, user }
}

// ─── Thunks ────────────────────────────────────────────────────────────────

export const signup = createAsyncThunk('auth/signup', async ({ name, email, password, role }, { rejectWithValue }) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return await firebaseExchange(result.user, name, role);
  } catch (err) {
    return rejectWithValue(
      err.code === 'auth/email-already-in-use' ? 'Email already registered' :
      err.code === 'auth/weak-password' ? 'Password must be at least 6 characters' :
      err.message || 'Signup failed'
    );
  }
});

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return await firebaseExchange(result.user);
  } catch (err) {
    return rejectWithValue(
      err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : err.message || 'Login failed'
    );
  }
});

export const googleLogin = createAsyncThunk('auth/googleLogin', async (_, { rejectWithValue }) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await firebaseExchange(result.user, result.user.displayName || '');
  } catch (err) {
    return rejectWithValue(err.message || 'Google sign-in failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut(auth);
  localStorage.removeItem('token');
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired');
  }
});

export const fetchAllUsers = createAsyncThunk('auth/fetchAllUsers', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/users');
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
  }
});

export const updateUserProfile = createAsyncThunk('auth/updateUserProfile', async (data, { rejectWithValue }) => {
  try {
    const res = await api.put('/users/profile', data);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update profile');
  }
});

// ─── Slice ─────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    users: [],
    token: localStorage.getItem('token'),
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    clearError(state) { state.error = null; },
    setInitialized(state) { state.initialized = true; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      // Signup
      .addCase(signup.pending, pending)
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
      })
      .addCase(signup.rejected, rejected)

      // Login
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
      })
      .addCase(login.rejected, rejected)

      // Google Login
      .addCase(googleLogin.pending, pending)
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
      })
      .addCase(googleLogin.rejected, rejected)

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.initialized = true;
      })

      // Fetch Me
      .addCase(fetchMe.pending, (state) => { state.loading = true; })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.initialized = true;
        localStorage.removeItem('token');
      })

      // All users
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })

      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      });
  },
});

export const { clearError, setInitialized } = authSlice.actions;
export default authSlice.reducer;
