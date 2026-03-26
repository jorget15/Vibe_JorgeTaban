import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { login } from '../store/authSlice'
import type { RootState } from '../store'

export default function SignIn() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  const dispatch        = useDispatch()
  const navigate        = useNavigate()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const role            = useSelector((state: RootState) => state.auth.role)
  const error           = useSelector((state: RootState) => state.auth.error)

  // Tracks whether the last login attempt was an admin triple-click
  const adminAttemptRef = useRef(false)
  // Counts rapid button clicks to detect triple-click
  const clickCountRef   = useRef(0)
  const clickTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      if (adminAttemptRef.current && role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
      adminAttemptRef.current = false
    }
  }, [isAuthenticated, role, navigate])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  // Intercepts the Sign In button click to detect triple-click (admin path).
  // Waits 400ms after the last click before deciding which mode to dispatch.
  function handleButtonClick(e: React.MouseEvent) {
    e.preventDefault()
    clickCountRef.current += 1

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)

    clickTimerRef.current = setTimeout(() => {
      const isTriple = clickCountRef.current >= 3
      clickCountRef.current = 0
      adminAttemptRef.current = isTriple
      dispatch(login({ email, password }))
    }, 400)
  }

  // Enter key still does a regular (non-admin) login
  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    adminAttemptRef.current = false
    dispatch(login({ email, password }))
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <div className="bg-citi-card border border-citi-border rounded-xl p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-citi-heading mb-2 tracking-tight">Welcome back</h1>
        <p className="text-citi-muted mb-8">Sign in to your VaultBank account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="block text-citi-text text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleButtonClick}
            className="w-full bg-citi-action text-white font-semibold py-3 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
