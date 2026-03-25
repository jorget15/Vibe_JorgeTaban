/* Account slice — holds the user's balance and transaction history.
   All actions are mock/local for now. When we connect the backend,
   these reducers will be replaced with async thunks that call the API. */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Transaction {
  id: number
  type: 'deposit' | 'withdrawal' | 'transfer'
  amount: number
  date: string
  description: string
}

interface AccountState {
  balance: number
  error: string | null
  transactions: Transaction[]
}

// Stores the most recent 100; dashboard renders only the latest 10
const MAX_TRANSACTIONS = 100

const initialState: AccountState = {
  balance: 5000.00,
  error: null,
  transactions: [
    { id: 1, type: 'deposit',    amount: 5000, date: '2026-03-01', description: 'Initial deposit' },
    { id: 2, type: 'withdrawal', amount: 200,  date: '2026-03-10', description: 'ATM withdrawal' },
    { id: 3, type: 'transfer',   amount: 150,  date: '2026-03-18', description: 'Sent to #00492' },
  ],
}

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    deposit(state, action: PayloadAction<number>) {
      state.balance += action.payload
      state.error = null
      state.transactions.unshift({
        id: Date.now(),
        type: 'deposit',
        amount: action.payload,
        date: new Date().toISOString().slice(0, 10),
        description: 'Deposit',
      })
      state.transactions = state.transactions.slice(0, MAX_TRANSACTIONS)
    },
    withdraw(state, action: PayloadAction<number>) {
      if (action.payload > state.balance) {
        state.error = 'Insufficient funds'
        return
      }
      state.balance -= action.payload
      state.error = null
      state.transactions.unshift({
        id: Date.now(),
        type: 'withdrawal',
        amount: action.payload,
        date: new Date().toISOString().slice(0, 10),
        description: 'Withdrawal',
      })
      state.transactions = state.transactions.slice(0, MAX_TRANSACTIONS)
    },
    transfer(state, action: PayloadAction<{ amount: number; recipient: string }>) {
      if (action.payload.amount > state.balance) {
        state.error = 'Insufficient funds'
        return
      }
      state.balance -= action.payload.amount
      state.error = null
      state.transactions.unshift({
        id: Date.now(),
        type: 'transfer',
        amount: action.payload.amount,
        date: new Date().toISOString().slice(0, 10),
        description: `Sent to #${action.payload.recipient}`,
      })
      state.transactions = state.transactions.slice(0, MAX_TRANSACTIONS)
    },
    clearError(state) {
      state.error = null
    },
  },
})

export const { deposit, withdraw, transfer, clearError } = accountSlice.actions
export default accountSlice.reducer
