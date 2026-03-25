import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import type { RootState } from '../store'
import { deposit, withdraw, transfer, clearError } from '../store/accountSlice'
import TransactionDrawer from '../components/TransactionDrawer'

export default function Dashboard() {
  const dispatch  = useDispatch()
  const { isAuthenticated, username } = useSelector((state: RootState) => state.auth)
  const { balance, transactions, error } = useSelector((state: RootState) => state.account)

  const [depositAmt,   setDepositAmt]   = useState('')
  const [withdrawAmt,  setWithdrawAmt]  = useState('')
  const [transferAmt,  setTransferAmt]  = useState('')
  const [recipient,    setRecipient]    = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  // Track transaction count so we can detect when a new one is added (= success)
  const prevTxnCount = useRef(transactions.length)
  useEffect(() => {
    if (transactions.length > prevTxnCount.current) {
      const latest = transactions[0]
      const message =
        latest.type === 'deposit'    ? 'Deposit successful' :
        latest.type === 'withdrawal' ? 'Withdrawal successful' :
        latest.description            // e.g. "Sent to #00492"
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
    if (!amount || amount <= 0) return
    dispatch(deposit(amount))
    setDepositAmt('')
  }

  function handleWithdraw(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const amount = parseFloat(withdrawAmt)
    if (!amount || amount <= 0) return
    dispatch(withdraw(amount))
    setWithdrawAmt('')
  }

  function handleTransfer(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const amount = parseFloat(transferAmt)
    if (!amount || amount <= 0 || !recipient) return
    dispatch(transfer({ amount, recipient }))
    setTransferAmt('')
    setRecipient('')
  }

  const typeStyles: Record<string, string> = {
    deposit:    'text-green-600',
    withdrawal: 'text-citi-red',
    transfer:   'text-citi-action',
  }

  if (!isAuthenticated) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Locked balance card */}
        <div className="bg-citi-card border-t-4 border-citi-border rounded-xl p-8 shadow-sm">
          <p className="text-citi-muted text-xs uppercase tracking-widest mb-1">Account Balance</p>
          <p className="text-5xl font-bold text-citi-border mt-2 tracking-widest">× × × × ×</p>
          <p className="text-citi-muted text-sm mt-2">Available balance · Checking</p>
        </div>

        {/* Locked action panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Deposit', 'Withdraw', 'Send'].map((label) => (
            <div key={label} className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 min-h-35">
              <span className="text-citi-border text-4xl font-bold">×</span>
              <p className="text-citi-muted text-sm text-center">{label} unavailable</p>
            </div>
          ))}
        </div>

        {/* Auth prompt */}
        <div className="bg-citi-card border border-citi-border rounded-xl p-8 text-center shadow-sm">
          <p className="text-citi-muted text-4xl mb-4">×</p>
          <p className="text-citi-heading font-semibold text-lg mb-1">Sign in to view your account info</p>
          <p className="text-citi-muted text-sm">Your balance, transactions, and actions are hidden until you log in.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">

      {/* Balance card — blue top border makes it stand out as the primary card */}
      <div className="bg-citi-card border-t-4 border-citi-action rounded-xl p-8 shadow-sm">
        <p className="text-citi-muted text-xs uppercase tracking-widest mb-1">
          Welcome back, {username}
        </p>
        <p className="text-5xl font-bold text-citi-heading mt-2">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-citi-muted text-sm mt-2">Available balance · Checking</p>
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

        {/* Transfer */}
        <div className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h2 className="text-citi-heading font-semibold text-lg mb-4">Send</h2>
          <form onSubmit={handleTransfer} className="space-y-3">
            <input
              type="text"
              value={recipient}
              onChange={(e) => { setRecipient(e.target.value); }}
              placeholder="Account number"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={transferAmt}
              onChange={(e) => { setTransferAmt(e.target.value); }}
              placeholder="Amount"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-2.5 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
            >
              Send
            </button>
          </form>
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
        <ul className="divide-y divide-citi-border">
          {transactions.slice(0, 10).map((txn) => (
            <li key={txn.id} className="px-6 py-4 flex justify-between items-center transition-colors duration-150 hover:bg-citi-surface">
              <div>
                <p className="text-citi-text text-sm font-medium">{txn.description}</p>
                <p className="text-citi-muted text-xs mt-0.5">{txn.date}</p>
              </div>
              <span className={`font-semibold text-sm ${typeStyles[txn.type]}`}>
                {txn.type === 'deposit' ? '+' : '−'} ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transactions={transactions}
      />

    </main>
  )
}
