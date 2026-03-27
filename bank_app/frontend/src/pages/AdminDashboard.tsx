import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { logout } from '../store/authSlice'
import type { RootState } from '../store'
import api from '../api'
import Spinner from '../components/Spinner'

interface AdminUser {
  userId:    number
  name:      string
  email:     string
  isAdmin:   boolean
  isDeleted: boolean
  createdAt: string
  txnCount:  number
  accounts:  { accountId: number; accountType: string; balance: number; txnCount: number; createdAt: string }[]
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { username, userId: adminUserId } = useSelector((state: RootState) => state.auth)

  const [users,    setUsers]    = useState<AdminUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [openRows, setOpenRows] = useState<Set<number>>(new Set())

  function toggleRow(userId: number) {
    setOpenRows(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  useEffect(() => {
    api.get('/users')
      .then(res => setUsers(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleDeactivate(user: AdminUser) {
    if (!window.confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return
    const accountId = user.accounts[0]?.accountId
    if (!accountId) return
    try {
      await api.delete(`/accounts/${accountId}`)
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, isDeleted: true } : u))
      toast.success(`${user.name} has been deactivated.`)
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not deactivate user.')
    }
  }

  function handleLogout() {
    dispatch(logout())
    navigate('/signin')
  }

  // Aggregate stats derived from real data
  const totalBalance = users.reduce(
    (sum, u) => sum + u.accounts.reduce((s, a) => s + a.balance, 0), 0
  )
  const totalTxns  = users.reduce((sum, u) => sum + u.txnCount, 0)
  const activeCount = users.filter(u => !u.isDeleted).length

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text font-admin">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="border-b border-admin-border bg-admin-surface px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-admin-green animate-pulse inline-block" />
          <span className="text-admin-accent font-bold tracking-[0.25em] text-sm uppercase">
            VaultBank Admin
          </span>
        </div>

        <div className="flex items-center gap-8 text-admin-muted text-xs">
          <span className="text-admin-text">{username}</span>
          <button
            onClick={handleLogout}
            className="text-admin-red hover:text-white transition-colors uppercase tracking-widest text-xs"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-8 py-10 space-y-8">

        {/* Page title */}
        <div>
          <p className="text-admin-muted text-xs tracking-[0.35em] uppercase mb-1">Control Panel</p>
          <h1 className="text-2xl font-bold text-admin-text">System Overview</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-admin-card border border-admin-border rounded-lg p-6">
                <p className="text-admin-muted text-xs tracking-[0.2em] uppercase mb-4">Active Accounts</p>
                <p className="text-4xl font-bold text-admin-text tabular-nums">{activeCount}</p>
              </div>
              <div className="bg-admin-card border border-admin-border rounded-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-admin-accent/5 pointer-events-none" />
                <p className="text-admin-muted text-xs tracking-[0.2em] uppercase mb-4">Total Assets (USD)</p>
                <p className="text-4xl font-bold text-admin-accent tabular-nums">${fmt(totalBalance)}</p>
              </div>
              <div className="bg-admin-card border border-admin-border rounded-lg p-6">
                <p className="text-admin-muted text-xs tracking-[0.2em] uppercase mb-4">Transactions</p>
                <p className="text-4xl font-bold text-admin-text tabular-nums">{totalTxns}</p>
              </div>
            </div>

            {/* ── Accounts table ──────────────────────────────────────────── */}
            <div className="bg-admin-card border border-admin-border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
                <p className="text-xs tracking-[0.25em] uppercase text-admin-muted">Registered Accounts</p>
                <span className="text-admin-green text-xs tabular-nums">
                  ● {activeCount} active
                </span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-border">
                    <th className="w-10" />
                    {['ID', 'Name', 'Email', 'Balance', 'Role', 'Txns', 'Since', ''].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-admin-muted text-xs tracking-wider uppercase font-normal ${
                          i >= 3 ? 'text-right' : 'text-left'
                        } ${h === 'Role' ? 'text-center!' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {users.map((user) => {
                    const balance  = user.accounts.reduce((s, a) => s + a.balance, 0)
                    const isOpen   = openRows.has(user.userId)
                    return (
                      <>
                        {/* ── Main user row ── */}
                        <tr
                          key={user.userId}
                          className={`transition-colors duration-150 ${
                            user.isDeleted ? 'opacity-40' : 'hover:bg-admin-surface'
                          }`}
                        >
                          <td className="pl-4">
                            <button
                              onClick={() => toggleRow(user.userId)}
                              aria-label={isOpen ? 'Collapse' : 'Expand'}
                              disabled={user.accounts.length === 0}
                              className="text-admin-muted hover:text-admin-text transition-colors disabled:opacity-30"
                            >
                              {/* Chevron — rotates when open */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-admin-muted text-xs tabular-nums">
                            {String(user.userId).padStart(6, '0')}
                          </td>
                          <td className="px-6 py-4 font-medium text-admin-text">{user.name}</td>
                          <td className="px-6 py-4 text-admin-muted">{user.email}</td>
                          <td className="px-6 py-4 text-right text-admin-accent tabular-nums font-medium">
                            ${fmt(balance)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wider uppercase ${
                              user.isAdmin
                                ? 'bg-admin-amber/10 text-admin-amber border border-admin-amber/30'
                                : 'bg-admin-accent/10 text-admin-accent border border-admin-accent/30'
                            }`}>
                              {user.isAdmin ? 'admin' : 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-admin-muted tabular-nums">{user.txnCount}</td>
                          <td className="px-6 py-4 text-right text-admin-muted">{user.createdAt}</td>
                          <td className="px-4 py-4 text-center">
                            {!user.isDeleted && user.userId !== adminUserId && user.accounts.length > 0 && (
                              <button
                                onClick={() => handleDeactivate(user)}
                                className="text-admin-red hover:text-white transition-colors text-xs uppercase tracking-widest"
                              >
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* ── Collapsible account rows — one per account, aligned to parent columns ── */}
                        {isOpen && user.accounts.map((acct) => (
                          <tr key={`${user.userId}-${acct.accountId}`} className="bg-admin-surface/50">
                            <td />
                            <td className="px-6 py-2 text-admin-muted text-xs tabular-nums">
                              #{String(acct.accountId).padStart(6, '0')}
                            </td>
                            <td className="px-6 py-2 text-admin-muted text-xs" colSpan={2}>
                              {acct.accountType.charAt(0) + acct.accountType.slice(1).toLowerCase()}
                            </td>
                            <td className="px-6 py-2 text-right text-admin-accent text-xs tabular-nums font-medium">
                              ${fmt(acct.balance)}
                            </td>
                            <td />
                            <td className="px-6 py-2 text-right text-admin-muted text-xs tabular-nums">
                              {acct.txnCount}
                            </td>
                            <td className="px-6 py-2 text-right text-admin-muted text-xs">
                              {acct.createdAt}
                            </td>
                            <td />
                          </tr>
                        ))}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs tracking-[0.3em] uppercase text-admin-muted/40 pt-4">
          VaultBank Admin Console · Build 0.1.0-alpha · {new Date().toISOString().slice(0, 10)}
        </p>
      </main>
    </div>
  )
}
