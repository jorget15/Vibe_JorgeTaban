import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../api'

export default function Register() {
  const navigate = useNavigate()

  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [accountType, setAccountType] = useState('CHECKING')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !password || !confirm) {
      toast.error('Please fill in all fields.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await api.post('/accounts', { name, email, accountType, password })
      toast.success('Account created! Please sign in.')
      navigate('/signin')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <div className="bg-citi-card border border-citi-border rounded-xl p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-citi-heading mb-2 tracking-tight">Create account</h1>
        <p className="text-citi-muted mb-8">Open your VaultBank account today</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-citi-text text-sm font-medium mb-2">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
          </div>

          <div>
            <label className="block text-citi-text text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
          </div>

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

          <div>
            <label className="block text-citi-text text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
          </div>

          <div>
            <label className="block text-citi-text text-sm font-medium mb-2">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-citi-action text-white font-semibold py-3 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-citi-muted">
          Already have an account?{' '}
          <Link to="/signin" className="text-citi-action hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
