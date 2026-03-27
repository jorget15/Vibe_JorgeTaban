/* TransactionDrawer.tsx — a slide-in panel showing the full transaction history.
 *
 * WHY A DRAWER INSTEAD OF A NEW PAGE?
 *   The user is already on the Dashboard looking at their balance. Opening a
 *   separate page would lose that context. A drawer slides in on top, lets
 *   them scroll through history, and closes back to the same Dashboard view.
 *
 * PAGINATION ("Load more"):
 *   All transactions are already in Redux memory (fetched on login).
 *   "Load more" just reveals the next 15 from the already-loaded array —
 *   no extra API call needed. The simulated delay (setTimeout) mimics what
 *   a real paginated API call would feel like and can be replaced later.
 *
 * TRANSACTION TYPES → COLORS:
 *   DEPOSIT / TRANSFER_IN  → green  (money coming in)
 *   WITHDRAW / TRANSFER_OUT → red   (money going out)
 */
import { useState, useEffect } from 'react'
import type { Transaction } from '../store/accountSlice'
import Spinner from './Spinner'

interface Props {
  open:         boolean
  onClose:      () => void
  transactions: Transaction[]
}

const PAGE_SIZE = 15

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

export default function TransactionDrawer({ open, onClose, transactions }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore,  setLoadingMore]  = useState(false)

  // Reset to first page every time the drawer is opened
  useEffect(() => {
    if (open) setVisibleCount(PAGE_SIZE)
  }, [open])

  function handleLoadMore() {
    setLoadingMore(true)
    // Simulated delay — mimics a real paginated API call.
    // Replace with api.get('/transactions?page=N') if the backend adds pagination.
    setTimeout(() => {
      setVisibleCount(c => c + PAGE_SIZE)
      setLoadingMore(false)
    }, 600)
  }

  const visible   = transactions.slice(0, visibleCount)
  const remaining = transactions.length - visibleCount

  return (
    <>
      {/* Backdrop — clicking it closes the drawer */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-in panel — translate-x-full moves it off screen; translate-x-0 brings it in */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-citi-card border-l border-citi-border z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-citi-border shrink-0">
          <div>
            <h2 className="text-citi-heading font-semibold text-lg">Transaction History</h2>
            <p className="text-citi-muted text-xs mt-0.5">{transactions.length} transactions</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-citi-muted hover:text-citi-text transition-colors p-1 rounded-md hover:bg-citi-surface"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-citi-muted">
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-citi-border">
                {visible.map((txn) => (
                  <li key={txn.id} className="px-6 py-4 flex justify-between items-center hover:bg-citi-surface transition-colors">
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${typeStyles[txn.type]}`}>
                        {typeLabels[txn.type]}
                      </span>
                      {txn.description && (
                        <p className="text-citi-text text-sm mt-0.5">{txn.description}</p>
                      )}
                      <p className="text-citi-muted text-xs mt-0.5">{txn.date}</p>
                    </div>
                    <span className={`font-semibold text-sm shrink-0 ml-4 ${typeStyles[txn.type]}`}>
                      {(txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN') ? '+' : '−'}
                      {' '}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="px-6 py-5">
                {remaining > 0 ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 border border-citi-border rounded-lg text-citi-text text-sm font-medium hover:bg-citi-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingMore ? <Spinner size="sm" /> : `Load more · ${remaining} remaining`}
                  </button>
                ) : (
                  <p className="text-center text-citi-muted text-xs">You've reached the beginning of your history</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
