import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ defaultTab = 'login', onBack }) {
  const [tab, setTab]       = useState(defaultTab)
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) throw signUpErr
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email }, { onConflict: 'id' })
        }
        setDone(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="auth-wrap">
      <div className="auth-box card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📜</div>
        <h2>Check your email</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: '10px' }}>
          A confirmation link has been sent to <strong>{email}</strong>.
          Click it to activate your account.
        </p>
        <button className="btn btn-ghost" style={{ marginTop: '20px' }} onClick={() => { setDone(false); setTab('login') }}>
          Back to login
        </button>
      </div>
    </div>
  )

  return (
    <div className="auth-wrap">
      {onBack && (
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '24px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← Back
        </button>
      )}
      <div className="auth-box">
        <div className="auth-logo">
          <div style={{ fontSize: '2.8rem' }}>⚔️</div>
          <h1>The Oracle's Table</h1>
          <p>Your adventure awaits</p>
        </div>
        <div className="card">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Sign In</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError('') }}>Create Account</button>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button className="btn btn-gold" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Working...' : tab === 'login' ? 'Enter the Realm' : 'Begin Your Journey'}
            </button>
          </form>
          {tab === 'signup' && (
            <>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px', textAlign: 'center' }}>
                Start with 10 free coins — enough to begin your first adventure.
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                By signing up, you agree to use this app responsibly. See our{' '}
                <a href="https://the-oracles-table.vercel.app/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-dim)', textDecoration: 'underline' }}>Terms</a>
                {' '}and{' '}
                <a href="https://the-oracles-table.vercel.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-dim)', textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
