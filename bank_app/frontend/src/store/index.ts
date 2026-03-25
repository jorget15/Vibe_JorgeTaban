/* Redux store — the single source of truth for all global state.
   configureStore wires together all slices.
   RootState and AppDispatch are TypeScript types exported so components
   can type their useSelector and useDispatch calls correctly. */
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import accountReducer from './accountSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
