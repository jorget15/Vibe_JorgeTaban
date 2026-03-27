import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { loginAsync, clearError } from '../store/authSlice'
import type { RootState, AppDispatch } from '../store'

export default function SignIn() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const dispatch        = useDispatch<AppDispatch>()
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
        navigate('/accounts')
      }
      adminAttemptRef.current = false
    }
  }, [isAuthenticated, role, navigate])

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError()) // clear immediately so it doesn't replay on next mount
    }
  }, [error, dispatch])

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
      dispatch(loginAsync({ email, password }))
    }, 400)
  }

  // Enter key still does a regular (non-admin) login
  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    adminAttemptRef.current = false
    dispatch(loginAsync({ email, password }))
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-citi-card border border-citi-border rounded-lg px-4 py-3 pr-12 text-citi-text placeholder-citi-muted/50 focus:outline-none focus:border-citi-action transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-citi-muted hover:text-citi-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleButtonClick}
            className="w-full bg-citi-action text-white font-semibold py-3 rounded-sm hover:bg-citi-blue transition-all duration-150 active:scale-95"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-citi-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-citi-action hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}
