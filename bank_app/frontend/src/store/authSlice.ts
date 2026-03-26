/* Auth slice — manages login state across the whole app.
   Redux Toolkit's createSlice bundles the state shape, initial values,
   and the reducer functions (actions) into one object.
   Components read state via useSelector and trigger actions via useDispatch. */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type Role = 'user' | 'admin'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  role: Role | null
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  role: null,
  error: null,
}

// Mock accounts — will be replaced with API calls when backend is connected.
const MOCK_ACCOUNTS = [
  { email: 'admin@bank.com', password: 'admin123', username: 'System Admin', role: 'admin' as Role },
  { email: 'user@bank.com',  password: 'user123',  username: 'John Doe',     role: 'user'  as Role },
]

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ email: string; password: string }>) {
      const { email, password } = action.payload
      const account = MOCK_ACCOUNTS.find(a => a.email === email && a.password === password)
      if (account) {
        state.isAuthenticated = true
        state.username = account.username
        state.role = account.role
        state.error = null
      } else {
        state.error = 'Invalid email or password'
      }
    },
    logout(state) {
      state.isAuthenticated = false
      state.username = null
      state.role = null
      state.error = null
    },
  },
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer
