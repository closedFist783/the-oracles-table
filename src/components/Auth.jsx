import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ defaultTab = 'login', onBack }) {
  const [tab, setTab]           = useState(defaultTab)
  const [identifier, setId]     = useState('')   // email OR username (login)
  const [email, setEmail]       = useState('')   // signup only
  const [username, setUsername] = useState('')   // signup only
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const usernameTimer = useRef(null)

  useEffect(() => {
    if (tab !== 'signup') return
    const val = username.trim()
    setUsernameStatus(null)
    clearTimeout(usernameTimer.current)
    if (!val) return
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', val).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
  }, [username, tab])

  async function resolveIdentifier(raw) {
    // If it looks like an email, use it directly
    if (raw.includes('@')) return raw
    // Otherwise look up username → email
    const { data } = await supabase.from('profiles').select('email').eq('username', raw.trim()).maybeSingle()
    if (!data?.email) throw new Error('No account found with that username.')
    return data.email
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        const resolvedEmail = await resolveIdentifier(identifier)
        const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password })
        if (error) throw error
      } else {
        if (!username.trim()) throw new Error('Username is required.')
        if (usernameStatus === 'taken') throw new Error('That username is already taken.')
        if (usernameStatus === 'invalid') throw new Error('Username must be 3–20 characters: letters, numbers, underscores only.')
        if (usernameStatus === 'checking') throw new Error('Still checking username availability…')
        // Create auth user
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) throw signUpErr
        // Store username + email in profile (trigger creates the row; we upsert to add username)
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id, username: username.trim(), email,
          }, { onConflict: 'id' })
        }
        setDone(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const usernameHint = {
    null:       null,
    checking:   { color: 'var(--text-dim)', text: '⏳ Checking…' },
    available:  { color: '#5d9',             text: '✓ Available' },
    taken:      { color: 'var(--red)',       text: '✗ Already taken' },
    invalid:    { color: 'var(--text-dim)', text: '3–20 characters: letters, numbers, underscores' },
  }[usernameStatus]

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
            {tab === 'login' ? (<>
              <div className="form-group">
                <label className="form-label">Email or Username</label>
                <input className="form-input" type="text" value={identifier}
                  onChange={e => setId(e.target.value)} required autoFocus
                  placeholder="Enter email or username" />
              </div>
            </>) : (<>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)} required autoFocus
                  placeholder="3–20 characters" maxLength={20} />
                {usernameHint && (
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', color: usernameHint.color }}>
                    {usernameHint.text}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
            </>)}
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
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px', textAlign: 'center' }}>
              Start with 10 free coins — enough to begin your first adventure.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
