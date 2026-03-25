import { useState, useEffect } from 'react'
import type { Transaction } from '../store/accountSlice'

interface Props {
  open: boolean
  onClose: () => void
  transactions: Transaction[]
}

const PAGE_SIZE = 15

const typeStyles: Record<string, string> = {
  deposit:    'text-green-600',
  withdrawal: 'text-citi-red',
  transfer:   'text-citi-action',
}

export default function TransactionDrawer({ open, onClose, transactions }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination each time the drawer opens
  useEffect(() => {
    if (open) setVisibleCount(PAGE_SIZE)
  }, [open])

  const visible = transactions.slice(0, visibleCount)
  const remaining = transactions.length - visibleCount

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-in panel */}
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
                      <p className="text-citi-text text-sm font-medium">{txn.description}</p>
                      <p className="text-citi-muted text-xs mt-0.5">{txn.date}</p>
                    </div>
                    <span className={`font-semibold text-sm shrink-0 ml-4 ${typeStyles[txn.type]}`}>
                      {txn.type === 'deposit' ? '+' : '−'} ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="px-6 py-5">
                {remaining > 0 ? (
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="w-full py-2.5 border border-citi-border rounded-lg text-citi-text text-sm font-medium hover:bg-citi-surface transition-colors"
                  >
                    Load more · {remaining} remaining
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
