
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { api } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })

      const token =
        response.data?.data?.token ??
        response.data?.token

      if (!token || typeof token !== 'string') {
        throw new Error('Token tidak ditemukan dalam respons login')
      }

      localStorage.setItem('carthage_token', token)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        'Login gagal. Periksa kembali kredensialmu.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4 py-10 text-zinc-100">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/[0.05] blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] shadow-2xl shadow-black/40 md:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-zinc-800 bg-[#0b0b0e] p-10 md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Activity size={21} />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Carthage<span className="text-emerald-400">.</span>
            </span>
          </div>

          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              PRIVATE SERVER MANAGEMENT
            </div>

            <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">
              Your server.
              <br />
              Your control.
              <br />
              <span className="text-emerald-400">One dashboard.</span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-500">
              Monitor your infrastructure, inspect system resources,
              and manage your home server from one secure workspace.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>© {new Date().getFullYear()} Carthage</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Private infrastructure
            </span>
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 md:p-12">
          <div className="mb-10 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Activity size={21} />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Carthage<span className="text-emerald-400">.</span>
            </span>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Welcome back
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Sign in to Carthage
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your credentials to access your server dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-zinc-800 bg-[#09090b] px-4 transition focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10">
                <Mail size={17} className="shrink-0 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@carthage.local"
                  className="h-full w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-zinc-800 bg-[#09090b] px-4 transition focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10">
                <LockKeyhole size={17} className="shrink-0 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-full w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="shrink-0 text-zinc-500 transition hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600">
            <LockKeyhole size={13} />
            Secured access · Private instance
          </div>
        </section>
      </div>
    </main>
  )
}