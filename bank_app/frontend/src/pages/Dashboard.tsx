import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import type { RootState, AppDispatch } from '../store'
import { depositAsync, withdrawAsync, transferAsync, clearError, fetchAccountAsync, fetchTransactionsAsync } from '../store/accountSlice'
import TransactionDrawer from '../components/TransactionDrawer'
import Spinner from '../components/Spinner'
import api from '../api'

export default function Dashboard() {
  const dispatch  = useDispatch<AppDispatch>()
  const navigate  = useNavigate()
  const { username, accountId } = useSelector((state: RootState) => state.auth)
  const { balance, accountType, transactions, loading, error } = useSelector((state: RootState) => state.account)

  const [depositAmt,   setDepositAmt]   = useState('')
  const [withdrawAmt,  setWithdrawAmt]  = useState('')
  const [transferAmt,  setTransferAmt]  = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  // send flow
  type SendStep = 'input' | 'confirm' | 'amount'
  type RecipientInfo = { accountId: number; name: string; email: string }
  const [sendStep,     setSendStep]     = useState<SendStep>('input')
  const [sendQuery,    setSendQuery]    = useState('')
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Load real balance and transactions when the user logs in
  useEffect(() => {
    if (accountId) {
      dispatch(fetchAccountAsync(accountId))
      dispatch(fetchTransactionsAsync(accountId))
    }
  }, [accountId, dispatch])

  // Track transaction count so we can detect when a new one is added (= success)
  const prevTxnCount = useRef(transactions.length)
  useEffect(() => {
    if (transactions.length > prevTxnCount.current) {
      const latest = transactions[0]
      const message =
        latest.type === 'DEPOSIT'      ? 'Deposit successful' :
        latest.type === 'WITHDRAW'     ? 'Withdrawal successful' :
        latest.description ?? 'Transfer successful'
      toast.success(message)
    }
    prevTxnCount.current = transactions.length
  }, [transactions])

  // Show error toast whenever the Redux error state is set
  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  function handleDeposit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const amount = parseFloat(depositAmt)
    if (!amount || amount <= 0 || !accountId) return
    dispatch(depositAsync({ accountId, amount }))
    setDepositAmt('')
  }

  function handleWithdraw(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const amount = parseFloat(withdrawAmt)
    if (!amount || amount <= 0 || !accountId) return
    dispatch(withdrawAsync({ accountId, amount }))
    setWithdrawAmt('')
  }

  async function handleLookup(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    if (!sendQuery.trim()) return
    setLookupLoading(true)
    try {
      const res = await api.get('/accounts/lookup', { params: { q: sendQuery.trim() } })
      setRecipientInfo(res.data)
      setSendStep('confirm')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Recipient not found')
    } finally {
      setLookupLoading(false)
    }
  }

  function handleTransfer(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const amount = parseFloat(transferAmt)
    if (!amount || amount <= 0 || !recipientInfo || !accountId) return
    dispatch(transferAsync({ accountId, recipientAccountId: recipientInfo.accountId, amount }))
    setTransferAmt('')
    setSendQuery('')
    setRecipientInfo(null)
    setSendStep('input')
  }

  function cancelSend() {
    setSendStep('input')
    setSendQuery('')
    setRecipientInfo(null)
    setTransferAmt('')
  }

  function formatDate(raw: string) {
    const d = new Date(raw)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  const typeStyles: Record<string, string> = {
    DEPOSIT:      'text-green-600',
    WITHDRAW:     'text-citi-red',
    TRANSFER_OUT: 'text-citi-red',
    TRANSFER_IN:  'text-green-600',
  }

  const typeLabels: Record<string, string> = {
    DEPOSIT:      'Deposit',
    WITHDRAW:     'Withdrawal',
    TRANSFER_OUT: 'Sent',
    TRANSFER_IN:  'Received',
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">

      {/* Back link */}
      <button
        onClick={() => navigate('/accounts')}
        className="flex items-center gap-1.5 text-citi-muted text-sm hover:text-citi-text transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All accounts
      </button>

      {/* Balance card — blue top border makes it stand out as the primary card */}
      <div className="bg-citi-card border-t-4 border-citi-action rounded-xl p-8 shadow-sm">
        <p className="text-citi-muted text-xs uppercase tracking-widest mb-1">
          Welcome back, {username}
        </p>
        <p className="text-5xl font-bold text-citi-heading mt-2">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-citi-muted text-sm mt-2">Available balance · {accountType ?? 'Checking'}</p>
        <p className="text-citi-muted text-xs mt-1">Account #{accountId}</p>
      </div>

      {/* Action panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Deposit */}
        <div className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h2 className="text-citi-heading font-semibold text-lg mb-4">Deposit</h2>
          <form onSubmit={handleDeposit} className="space-y-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmt}
              onChange={(e) => { setDepositAmt(e.target.value); }}
              placeholder="Amount"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
            >
              Deposit
            </button>
          </form>
        </div>

        {/* Withdraw */}
        <div className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h2 className="text-citi-heading font-semibold text-lg mb-4">Withdraw</h2>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={withdrawAmt}
              onChange={(e) => { setWithdrawAmt(e.target.value); }}
              placeholder="Amount"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
            >
              Withdraw
            </button>
          </form>
        </div>

        {/* Send — 3-step flow */}
        <div className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h2 className="text-citi-heading font-semibold text-lg mb-4">Send</h2>

          {sendStep === 'input' && (
            <form onSubmit={handleLookup} className="space-y-3">
              <input
                type="text"
                value={sendQuery}
                onChange={(e) => setSendQuery(e.target.value)}
                placeholder="Account number or email"
                className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95 disabled:opacity-60"
              >
                {lookupLoading ? 'Looking up…' : 'Find Recipient'}
              </button>
            </form>
          )}

          {sendStep === 'confirm' && recipientInfo && (
            <div className="space-y-4">
              <p className="text-citi-muted text-sm">This account belongs to:</p>
              <div className="bg-citi-surface border border-citi-border rounded-lg px-4 py-3">
                <p className="text-citi-heading font-semibold">{recipientInfo.name}</p>
                <p className="text-citi-muted text-xs mt-0.5">{recipientInfo.email}</p>
              </div>
              <p className="text-citi-muted text-sm">Do you want to proceed?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSendStep('amount')}
                  className="flex-1 bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
                >
                  Yes
                </button>
                <button
                  onClick={cancelSend}
                  className="flex-1 border border-citi-border text-citi-muted font-semibold py-2.5 rounded-sm hover:bg-citi-surface transition-all duration-150 active:scale-95"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {sendStep === 'amount' && recipientInfo && (
            <form onSubmit={handleTransfer} className="space-y-3">
              <p className="text-citi-muted text-sm">
                Sending to <span className="text-citi-heading font-medium">{recipientInfo.name}</span>
              </p>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={transferAmt}
                onChange={(e) => setTransferAmt(e.target.value)}
                placeholder="Amount"
                className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={cancelSend}
                  className="flex-1 border border-citi-border text-citi-muted font-semibold py-2.5 rounded-sm hover:bg-citi-surface transition-all duration-150 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-citi-card border border-citi-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-citi-border flex items-center justify-between">
          <h2 className="text-citi-heading font-semibold text-lg">Recent Transactions</h2>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-citi-action text-sm font-medium hover:underline"
          >
            View all
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <ul className="divide-y divide-citi-border">
            {transactions.slice(0, 10).map((txn) => (
              <li key={txn.id} className="px-6 py-4 flex justify-between items-center transition-colors duration-150 hover:bg-citi-surface">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${typeStyles[txn.type]}`}>
                    {typeLabels[txn.type]}
                  </span>
                  {txn.description && (
                    <p className="text-citi-text text-sm mt-0.5">{txn.description}</p>
                  )}
                  <p className="text-citi-muted text-xs mt-0.5">{formatDate(txn.date)}</p>
                </div>
                <span className={`font-semibold text-sm shrink-0 ml-4 ${typeStyles[txn.type]}`}>
                  {(txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN') ? '+' : '−'} ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transactions={transactions}
      />

    </main>
  )
}
