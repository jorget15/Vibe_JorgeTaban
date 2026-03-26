import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'
import type { RootState } from '../store'

// Mock system data — replace with API calls when backend is connected
const MOCK_USERS = [
  {
    id: '000001',
    name: 'System Admin',
    email: 'admin@bank.com',
    balance: 50000,
    role: 'admin',
    status: 'active',
    txnCount: 8,
    since: '2025-01-01',
  },
  {
    id: '000002',
    name: 'John Doe',
    email: 'user@bank.com',
    balance: 5000,
    role: 'user',
    status: 'active',
    txnCount: 3,
    since: '2026-03-01',
  },
]

const totalBalance = MOCK_USERS.reduce((sum, u) => sum + u.balance, 0)
const totalTxns    = MOCK_USERS.reduce((sum, u) => sum + u.txnCount, 0)

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { username } = useSelector((state: RootState) => state.auth)

  function handleLogout() {
    dispatch(logout())
    navigate('/signin')
  }

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

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-admin-card border border-admin-border rounded-lg p-6">
            <p className="text-admin-muted text-xs tracking-[0.2em] uppercase mb-4">Accounts</p>
            <p className="text-4xl font-bold text-admin-text tabular-nums">{MOCK_USERS.length}</p>
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

        {/* ── Accounts table ────────────────────────────────────────────── */}
        <div className="bg-admin-card border border-admin-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
            <p className="text-xs tracking-[0.25em] uppercase text-admin-muted">Registered Accounts</p>
            <span className="text-admin-green text-xs tabular-nums">
              ● {MOCK_USERS.filter(u => u.status === 'active').length} active
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                {['ID', 'Name', 'Email', 'Balance', 'Role', 'Txns', 'Since'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-admin-muted text-xs tracking-wider uppercase font-normal ${
                      i >= 3 ? 'text-right' : 'text-left'
                    } ${h === 'Role' ? '!text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {MOCK_USERS.map((user) => (
                <tr key={user.id} className="hover:bg-admin-surface transition-colors duration-150">
                  <td className="px-6 py-4 text-admin-muted text-xs tabular-nums">{user.id}</td>
                  <td className="px-6 py-4 font-medium text-admin-text">{user.name}</td>
                  <td className="px-6 py-4 text-admin-muted">{user.email}</td>
                  <td className="px-6 py-4 text-right text-admin-accent tabular-nums font-medium">
                    ${fmt(user.balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wider uppercase ${
                      user.role === 'admin'
                        ? 'bg-admin-amber/10 text-admin-amber border border-admin-amber/30'
                        : 'bg-admin-accent/10 text-admin-accent border border-admin-accent/30'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-admin-muted tabular-nums">{user.txnCount}</td>
                  <td className="px-6 py-4 text-right text-admin-muted">{user.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p className="text-center text-xs tracking-[0.3em] uppercase text-admin-muted/40 pt-4">
          VaultBank Admin Console · Build 0.1.0-alpha · {new Date().toISOString().slice(0, 10)}
        </p>
      </main>
    </div>
  )
}
