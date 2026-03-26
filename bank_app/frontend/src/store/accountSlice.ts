/* accountSlice.ts — manages balance, account type, and transaction history.
 *
 * WHY IS THIS A SEPARATE SLICE FROM authSlice?
 *   authSlice answers "who is logged in?" (identity).
 *   accountSlice answers "what does their account look like?" (financial data).
 *   Keeping them separate makes each slice smaller and easier to reason about.
 *   It also means logging out (clearing auth) doesn't automatically wipe the
 *   account data — we could reset it separately if needed.
 *
 * ALL FIVE OPERATIONS ARE ASYNC THUNKS:
 *   fetch, deposit, withdraw, transfer, and fetchTransactions all call the
 *   real backend API. There are no fake local reducers left — every action
 *   that changes money goes through the database.
 *
 * WHY RE-FETCH TRANSACTIONS AFTER EACH ACTION?
 *   After a deposit, the backend creates a new transaction row. Rather than
 *   manually building that row on the frontend and risking getting it wrong
 *   (wrong ID, wrong date format), we just ask the backend to send the full
 *   up-to-date list. One extra GET request, but always correct.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api'

/* Transaction shape mirrors the backend response, with txnId renamed to id
 * so the rest of the frontend doesn't need to know the backend field name. */
export interface Transaction {
  id:          number
  type:        'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_OUT' | 'TRANSFER_IN'
  amount:      number
  date:        string
  description: string | null
}

interface AccountState {
  balance:     number
  accountType: string | null  // 'CHECKING' or 'SAVINGS' — shown in the balance card
  loading:     boolean        // true while fetching account data on login
  error:       string | null  // set on failed actions — shown as error toast
  transactions: Transaction[]
}

const initialState: AccountState = {
  balance:     0,
  accountType: null,
  loading:     false,
  error:       null,
  transactions: [],
}

// ── Fetch ──────────────────────────────────────────────────────────────────

/* fetchAccountAsync — called once when the user logs in (Dashboard useEffect).
 * Loads the real balance and account type from the database. */
export const fetchAccountAsync = createAsyncThunk(
  'account/fetchAccount',
  async (accountId: number) => {
    const res = await api.get(`/accounts/${accountId}`)
    return res.data   // { accountId, userName, email, balance, accountType }
  }
)

/* fetchTransactionsAsync — called on login AND after every deposit/withdraw/transfer.
 * Always fetches the full list so the UI stays in sync with the database. */
export const fetchTransactionsAsync = createAsyncThunk(
  'account/fetchTransactions',
  async (accountId: number) => {
    const res = await api.get(`/accounts/${accountId}/transactions`)
    return res.data   // [{ txnId, type, amount, description, date }, ...]
  }
)

// ── Actions ────────────────────────────────────────────────────────────────

/* depositAsync — POST /accounts/:id/deposit { amount }
 * The backend validates the amount (must be positive) and updates the balance.
 * We dispatch fetchTransactionsAsync from inside the thunk so the list refreshes
 * automatically after every successful deposit. */
export const depositAsync = createAsyncThunk(
  'account/deposit',
  async (
    { accountId, amount }: { accountId: number; amount: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await api.post(`/accounts/${accountId}/deposit`, { amount })
      dispatch(fetchTransactionsAsync(accountId))  // refresh transaction list
      return res.data   // { accountId, balance }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Deposit failed')
    }
  }
)

/* withdrawAsync — POST /accounts/:id/withdraw { amount }
 * The backend checks for insufficient funds and returns 400 if the balance
 * is too low. rejectWithValue passes that message to the error toast. */
export const withdrawAsync = createAsyncThunk(
  'account/withdraw',
  async (
    { accountId, amount }: { accountId: number; amount: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await api.post(`/accounts/${accountId}/withdraw`, { amount })
      dispatch(fetchTransactionsAsync(accountId))
      return res.data   // { accountId, balance }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Withdrawal failed')
    }
  }
)

/* transferAsync — POST /accounts/:id/transfer { recipientAccountId, amount }
 * The backend performs all four writes (two balance updates + two transaction
 * records) atomically. If anything fails, the whole operation rolls back. */
export const transferAsync = createAsyncThunk(
  'account/transfer',
  async (
    { accountId, recipientAccountId, amount }: { accountId: number; recipientAccountId: number; amount: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await api.post(`/accounts/${accountId}/transfer`, { recipientAccountId, amount })
      dispatch(fetchTransactionsAsync(accountId))
      return res.data   // { accountId, balance }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Transfer failed')
    }
  }
)

// ── Slice ──────────────────────────────────────────────────────────────────

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    /* clearError is called by Dashboard after showing the error toast.
     * Without this, the same error would re-trigger the toast on every render. */
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch account ──────────────────────────────────────────────────
      .addCase(fetchAccountAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAccountAsync.fulfilled, (state, action) => {
        state.loading     = false
        state.balance     = action.payload.balance
        state.accountType = action.payload.accountType
      })

      // ── Fetch transactions ─────────────────────────────────────────────
      // txnId is the backend field name; we rename it to id here so
      // components use a consistent name and don't depend on backend naming.
      .addCase(fetchTransactionsAsync.fulfilled, (state, action) => {
        state.transactions = action.payload.map((t: any) => ({
          id:          t.txnId,
          type:        t.type,
          amount:      t.amount,
          date:        t.date,
          description: t.description,
        }))
      })

      // ── Deposit ────────────────────────────────────────────────────────
      // On success, update balance immediately from the server's confirmed value.
      // The transaction list update comes from the fetchTransactionsAsync dispatch.
      .addCase(depositAsync.fulfilled, (state, action) => {
        state.balance = action.payload.balance
      })
      .addCase(depositAsync.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // ── Withdraw ───────────────────────────────────────────────────────
      .addCase(withdrawAsync.fulfilled, (state, action) => {
        state.balance = action.payload.balance
      })
      .addCase(withdrawAsync.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // ── Transfer ───────────────────────────────────────────────────────
      .addCase(transferAsync.fulfilled, (state, action) => {
        state.balance = action.payload.balance
      })
      .addCase(transferAsync.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { clearError } = accountSlice.actions
export default accountSlice.reducer
