/* authSlice.ts — manages everything related to who is logged in.
 *
 * WHY REDUX FOR AUTH?
 *   After login, many unrelated components need to know who the user is:
 *   the Navbar shows the username, the Dashboard shows the balance, the
 *   ProtectedRoute decides whether to redirect. Passing this data down
 *   through props to every component would be messy. Redux puts it in one
 *   central store that any component can read directly.
 *
 * HOW A THUNK WORKS (loginAsync):
 *   Normally Redux actions are plain objects: { type: 'auth/login', payload: ... }
 *   A thunk is a function instead of an object. Redux middleware intercepts it,
 *   calls it, and passes dispatch/getState so it can do async work (API calls).
 *
 *   When you dispatch loginAsync({ email, password }):
 *     1. Middleware calls the payload creator function
 *     2. It auto-dispatches loginAsync.pending  → loading: true
 *     3. The API call runs
 *     4a. On success → loginAsync.fulfilled, payload = res.data → state updates
 *     4b. On failure → loginAsync.rejected,  payload = error string → error shown
 *
 *   extraReducers is where we handle those three auto-dispatched actions.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api'

export type Role = 'user' | 'admin'

interface AuthState {
  isAuthenticated: boolean
  userId:    number | null  // the user's DB primary key
  accountId: number | null  // the user's first (and currently only) account ID
  username:  string | null  // display name shown in the UI
  role:      Role   | null  // 'admin' routes to /admin, 'user' routes to /dashboard
  loading:   boolean        // true while the login API call is in flight
  error:     string | null  // set when login fails — displayed as a toast in SignIn
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId:    null,
  accountId: null,
  username:  null,
  role:      null,
  loading:   false,
  error:     null,
}

/* loginAsync — sends credentials to POST /api/login.
 * The second argument ({ rejectWithValue }) is provided by Redux Toolkit.
 * rejectWithValue lets us pass a custom error message to the rejected case
 * instead of the raw Axios error object, which is harder to display. */
export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/login', { email, password })
      return res.data   // { userId, name, email, isAdmin, accountId }
    } catch (err: any) {
      // err.response?.data?.error is the { "error": "..." } body from the Flask 401
      return rejectWithValue(err.response?.data?.error ?? 'Login failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /* logout is synchronous — no API call needed, just wipe the local state.
     * The backend has no session to destroy because we don't use server-side
     * sessions; authentication state lives entirely in the Redux store. */
    logout(state) {
      state.isAuthenticated = false
      state.userId    = null
      state.accountId = null
      state.username  = null
      state.role      = null
      state.loading   = false
      state.error     = null
    },
    // Clears a stale error so it doesn't replay as a toast on the next mount.
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // While the request is in flight — show a loading indicator
      .addCase(loginAsync.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      // Request succeeded — populate state from the server response
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading        = false
        state.isAuthenticated = true
        state.userId    = action.payload.userId
        state.accountId = action.payload.accountId
        state.username  = action.payload.name
        // isAdmin is a boolean from the backend; we convert it to a role string
        // so the frontend can use it in readable conditions like role === 'admin'
        state.role  = action.payload.isAdmin ? 'admin' : 'user'
        state.error = null
      })
      // Request failed (wrong password, deleted account, etc.)
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.error   = action.payload as string
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
