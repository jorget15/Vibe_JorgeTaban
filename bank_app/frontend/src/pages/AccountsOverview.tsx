import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import type { RootState, AppDispatch } from '../store'
import { setActiveAccount, logout } from '../store/authSlice'
import api from '../api'

interface AccountSummary {
  accountId:   number
  accountType: 'CHECKING' | 'SAVINGS'
  balance:     number
}

export default function AccountsOverview() {
  const dispatch  = useDispatch<AppDispatch>()
  const navigate  = useNavigate()
  const { userId, username } = useSelector((state: RootState) => state.auth)

  const [accounts,    setAccounts]    = useState<AccountSummary[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [accountType, setAccountType] = useState('CHECKING')
  const [creating,    setCreating]    = useState(false)

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}/accounts`)
      .then(res => setAccounts(res.data))
      .catch(() => toast.error('Could not load accounts.'))
      .finally(() => setLoading(false))
  }, [userId])

  function handleManage(accountId: number) {
    dispatch(setActiveAccount(accountId))
    navigate('/dashboard')
  }

  async function handleDeleteSelf() {
    if (!window.confirm('Are you sure you want to delete your profile? All your funds and transaction history will be lost. This cannot be undone.')) return
    const accountId = accounts[0]?.accountId
    if (!accountId) return
    try {
      await api.delete(`/accounts/${accountId}`)
      dispatch(logout())
      navigate('/signin')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not close profile.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post(`/users/${userId}/accounts`, { accountType })
      setAccounts(prev => [...prev, res.data])
      setShowForm(false)
      setAccountType('CHECKING')
      toast.success('New account opened!')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not open account.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-citi-heading tracking-tight">Your Accounts</h1>
          <p className="text-citi-muted mt-1">Welcome back, {username}</p>
        </div>
        <button
          onClick={handleDeleteSelf}
          className="text-citi-red text-sm hover:underline mt-1"
        >
          Delete profile
        </button>
      </div>

      {/* Account list */}
      <div className="bg-citi-card border border-citi-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-center text-citi-muted text-sm">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="px-6 py-10 text-center text-citi-muted text-sm">No accounts found.</div>
        ) : (
          <ul className="divide-y divide-citi-border">
            {accounts.map((acct) => (
              <li key={acct.accountId} className="px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-citi-text font-medium">
                    {acct.accountType === 'CHECKING' ? 'Checking' : 'Savings'}
                  </p>
                  <p className="text-citi-muted text-xs mt-0.5">Account #{acct.accountId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-citi-heading font-semibold text-lg">
                    ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => handleManage(acct.accountId)}
                    className="bg-citi-action text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
                  >
                    Manage
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Open new account */}
      {showForm ? (
        <div className="bg-citi-card border border-citi-border rounded-xl p-6 shadow-sm">
          <h2 className="text-citi-heading font-semibold text-lg mb-4">Open New Account</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-citi-text text-sm font-medium mb-2">Account type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text focus:outline-none focus:border-citi-action transition-colors"
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-citi-action text-white font-semibold py-2.5 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95 disabled:opacity-60"
              >
                {creating ? 'Opening…' : 'Open Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-citi-border text-citi-muted font-semibold py-2.5 rounded-sm hover:bg-citi-surface transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-citi-border text-citi-text font-semibold py-3 rounded-xl hover:bg-citi-card transition-all duration-150"
        >
          + Open New Account
        </button>
      )}

    </main>
  )
}
