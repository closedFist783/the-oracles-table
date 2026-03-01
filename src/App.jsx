import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import CharacterCreator from './components/CharacterCreator'
import Campaign from './components/Campaign'
import Upgrade from './components/Upgrade'
import Profile from './components/Profile'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('dashboard') // dashboard | create | campaign | upgrade
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stripeToast, setStripeToast] = useState(null) // 'success' | 'canceled' | null
  const [authMode, setAuthMode] = useState(null) // null=landing | 'signin' | 'signup'

  // Handle Stripe redirect back to the app
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripe = params.get('stripe')
    if (stripe === 'success') {
      setStripeToast('success')
      setView('upgrade')
      setTimeout(() => setStripeToast(null), 6000)
    } else if (stripe === 'canceled') {
      setStripeToast('canceled')
      setView('upgrade')
      setTimeout(() => setStripeToast(null), 4000)
    }
    // Clean up the URL so it doesn't re-trigger on refresh
    if (stripe) window.history.replaceState({}, '', window.location.pathname)
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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gold)', fontStyle: 'italic' }}>
      Loading...
    </div>
  )

  if (!session) {
    if (!authMode) return (
      <Landing
        onSignUp={() => setAuthMode('signup')}
        onSignIn={() => setAuthMode('signin')}
      />
    )
    return (
      <Auth
        defaultTab={authMode === 'signup' ? 'signup' : 'login'}
        onBack={() => setAuthMode(null)}
      />
    )
  }

  return (
    <div className="app">
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
          {profile && <span className="topbar-coins">🪙 {profile.coins} coins</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => setView('dashboard')}>Characters</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('upgrade')}>Upgrade</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('profile')}
            title="Profile" style={{ fontSize: '1.1rem', padding: '4px 8px' }}>
            {profile?.avatar ?? '🧙'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>Sign Out</button>
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
            onBack={() => setView('dashboard')} />
        )}
      </div>
    </div>
  )
}
