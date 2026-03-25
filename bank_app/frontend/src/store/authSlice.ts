/* Auth slice — manages login state across the whole app.
   Redux Toolkit's createSlice bundles the state shape, initial values,
   and the reducer functions (actions) into one object.
   Components read state via useSelector and trigger actions via useDispatch. */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  error: null,
}

// Hardcoded credentials — will be replaced with a real API call later.
const HARDCODED_EMAIL = 'admin@bank.com'
const HARDCODED_PASSWORD = 'admin123'

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ email: string; password: string }>) {
      const { email, password } = action.payload
      if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
        state.isAuthenticated = true
        state.username = email
        state.error = null
      } else {
        state.error = 'Invalid email or password'
      }
    },
    logout(state) {
      state.isAuthenticated = false
      state.username = null
      state.error = null
    },
  },
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer
