import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import CharacterCreator from './components/CharacterCreator'
import Campaign from './components/Campaign'
import Upgrade from './components/Upgrade'
import Profile from './components/Profile'
import Disclaimer from './components/Disclaimer'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('dashboard') // dashboard | create | campaign | upgrade
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stripeToast, setStripeToast] = useState(null) // 'success' | 'canceled' | null
  const [authMode, setAuthMode] = useState(null) // null=landing | 'signin' | 'signup'
  const [verifying, setVerifying] = useState(false)   // email confirmation in progress
  const [verifyError, setVerifyError] = useState(null) // email confirmation error

  // Handle Stripe redirect + Supabase email confirmation code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripe = params.get('stripe')
    const code   = params.get('code')
    const type   = params.get('type') // 'signup' | 'recovery' etc.

    if (stripe === 'success') {
      setStripeToast('success')
      setView('upgrade')
      setTimeout(() => setStripeToast(null), 6000)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (stripe === 'canceled') {
      setStripeToast('canceled')
      setView('upgrade')
      setTimeout(() => setStripeToast(null), 4000)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (code) {
      // Supabase PKCE email confirmation — detectSessionInUrl handles the exchange
      // automatically on client init and fires onAuthStateChange → fetchProfile clears verifying
      window.history.replaceState({}, '', window.location.pathname)
      setVerifying(true)
      // Safety timeout: if onAuthStateChange never fires (e.g. code expired), bail after 8s
      setTimeout(() => {
        setVerifying(v => { if (v) { setVerifyError('Confirmation timed out — your link may have expired. Please sign up again.') } return false })
      }, 8000)
    }

    // Handle hash-fragment errors (e.g. expired OTP link: #error=access_denied&error_code=otp_expired)
    const hash = window.location.hash
    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const errDesc = hashParams.get('error_description')
      const errCode = hashParams.get('error_code')
      window.history.replaceState({}, '', window.location.pathname)
      if (errCode === 'otp_expired' || errDesc) {
        setVerifyError(
          errCode === 'otp_expired'
            ? 'Your confirmation link has expired. Please sign up again to get a new one.'
            : decodeURIComponent((errDesc ?? '').replace(/\+/g, ' '))
        )
      }
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
    } catch { /* profile load failed — still proceed */ }
    setLoading(false)
    setVerifying(false) // clear email verification spinner on sign-in
  }

  async function refreshProfile() {
    if (session) fetchProfile(session.user.id)
  }

  // Refresh profile after a successful Stripe payment so coin count updates
  useEffect(() => {
    if (stripeToast === 'success' && session) refreshProfile()
  }, [stripeToast, session])

  function goToCampaign(campaign) {
    setActiveCampaign(campaign)
    setView('campaign')
  }

  // Email confirmation — show a dedicated screen while verifying
  if (verifying || verifyError) return (
    <>
      <Disclaimer />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>{verifyError ? '⚠️' : '⚔️'}</div>
        <h2 style={{ color: 'var(--gold)', margin: 0 }}>
          {verifyError ? 'Verification Failed' : 'Confirming your email…'}
        </h2>
        {verifyError
          ? <>
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', maxWidth: '360px', margin: 0 }}>{verifyError}</p>
              <button className="btn btn-gold" onClick={() => { setVerifyError(null); setAuthMode('signin') }}>
                Back to Sign In
              </button>
            </>
          : <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>Hang tight, your adventure awaits…</p>
        }
      </div>
    </>
  )

  if (loading) return (
    <>
      <Disclaimer />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gold)', fontStyle: 'italic' }}>
        Loading...
      </div>
    </>
  )

  if (!session) {
    if (!authMode) return (
      <>
        <Disclaimer />
        <Landing
          onSignUp={() => setAuthMode('signup')}
          onSignIn={() => setAuthMode('signin')}
        />
      </>
    )
    return (
      <>
        <Disclaimer />
        <Auth
          defaultTab={authMode === 'signup' ? 'signup' : 'login'}
          onBack={() => setAuthMode(null)}
        />
      </>
    )
  }

  return (
    <div className="app">
      <Disclaimer />
      {/* Stripe payment toast */}
      {stripeToast && (
        <div style={{
          position: 'fixed', top: '72px', right: '24px', zIndex: 999,
          background: stripeToast === 'success' ? 'var(--green)' : 'var(--surface2)',
          color: stripeToast === 'success' ? '#001a00' : 'var(--text-dim)',
          border: `1px solid ${stripeToast === 'success' ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '12px 20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)', fontSize: '0.9rem',
          animation: 'fadeInUp 0.25s ease',
        }}>
          {stripeToast === 'success'
            ? '✅ Payment successful! Your account has been updated.'
            : '↩ Payment canceled — nothing was charged.'}
        </div>
      )}
      <nav className="topbar">
        <span className="topbar-title" style={{ cursor: 'pointer' }} onClick={() => setView('dashboard')}>⚔️ The Oracle's Table</span>
        <div className="topbar-nav">
          {profile && <span className="topbar-coins">🪙 {profile.coins}</span>}
          <button className="btn btn-ghost btn-sm topbar-hide-mobile" onClick={() => setView('dashboard')}>Characters</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('upgrade')}>Upgrade</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('profile')}
            title="Profile" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '20px' }}>
            {profile?.avatar?.startsWith('http')
              ? <img src={profile.avatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
              : profile?.avatar && !profile.avatar.startsWith('http')
                ? <span style={{ fontSize: '1rem' }}>{profile.avatar}</span>
                : (() => {
                    const name = profile?.username || session?.user?.email || ''
                    const initials = name.includes('@') ? name[0].toUpperCase() : name.slice(0,2).toUpperCase()
                    return (
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gold-dim)', color: 'var(--bg)', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials || '?'}
                      </span>
                    )
                  })()
            }
            <span className="topbar-username">
              {profile?.username || (session?.user?.email?.split('@')[0] ?? '')}
            </span>
          </button>
          <button className="btn btn-ghost btn-sm topbar-hide-mobile" onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </nav>

      <div className="main">
        {view === 'dashboard' && (
          <Dashboard
            session={session}
            profile={profile}
            onCreateChar={() => setView('create')}
            onPlayCampaign={goToCampaign}
          />
        )}
        {view === 'create' && (
          <CharacterCreator
            session={session}
            profile={profile}
            onDone={() => { setView('dashboard'); refreshProfile() }}
            onCancel={() => setView('dashboard')}
            onCoinsChanged={refreshProfile}
          />
        )}
        {view === 'campaign' && activeCampaign && (
          <Campaign
            session={session}
            profile={profile}
            campaign={activeCampaign}
            onCoinsChanged={refreshProfile}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'upgrade' && (
          <Upgrade session={session} profile={profile} onBack={() => setView('dashboard')} />
        )}
        {view === 'profile' && (
          <Profile user={session?.user} profile={profile}
            onProfileUpdate={p => setProfile(p)}
            onBack={() => setView('dashboard')}
            onSignOut={() => supabase.auth.signOut()} />
        )}
      </div>
    </div>
  )
}
