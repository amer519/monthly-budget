import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError(error)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 dark:bg-surface-dark">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-savings text-3xl font-bold text-white shadow-lg shadow-brand/30">
            $
          </div>
          <h1 className="text-2xl font-semibold text-ink dark:text-ink-dark">Budget</h1>
          <p className="text-sm text-muted dark:text-muted-dark">Sign in to your household budget</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted dark:text-muted-dark" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-ink outline-none ring-brand/30 focus:ring-4 dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted dark:text-muted-dark" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border border-border bg-card px-4 py-3.5 text-base text-ink outline-none ring-brand/30 focus:ring-4 dark:border-border-dark dark:bg-card-dark dark:text-ink-dark"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-2xl bg-ink px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 dark:bg-ink-dark dark:text-surface-dark"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
