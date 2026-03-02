import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ session, profile, onCreateChar, onPlayCampaign }) {
  const [characters, setCharacters] = useState([])
  const [campaigns, setCampaigns] = useState({}) // keyed by character_id
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [session])

  async function loadData() {
    const [{ data: chars }, { data: camps }] = await Promise.all([
      supabase.from('characters').select('*').eq('user_id', session.user.id).order('created_at'),
      supabase.from('campaigns').select('*').eq('user_id', session.user.id),
    ])
    setCharacters(chars || [])
    // Index campaigns by character_id (one per character)
    const campMap = {}
    for (const c of (camps || [])) campMap[c.character_id] = c
    setCampaigns(campMap)
    setLoading(false)
  }

  async function handlePlay(character) {
    const existing = campaigns[character.id]
    if (existing) {
      // Resume — fetch full campaign with character
      const { data } = await supabase
        .from('campaigns').select('*, characters(*)')
        .eq('id', existing.id).single()
      onPlayCampaign(data)
    } else {
      // Create new campaign for this character
      const { data } = await supabase
        .from('campaigns')
        .insert({ user_id: session.user.id, character_id: character.id, title: `${character.name}'s Adventure` })
        .select('*, characters(*)').single()
      onPlayCampaign(data)
    }
  }

  const slots = profile?.character_slots ?? 1

  if (loading) return <div className="empty-state">Loading your realm...</div>

  return (
    <div>
      <div className="section-header">
        <h2>Your Characters</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {characters.length}/{slots} slots
        </span>
      </div>

      <div className="dashboard-grid">
        {characters.map(char => {
          const camp = campaigns[char.id]
          return (
            <div key={char.id} className="char-card">
              <h3>{char.name}</h3>
              <p className="char-meta">Level {char.level} {char.race} {char.class}</p>
              <p className="char-meta" style={{ marginBottom: '10px' }}>{char.background}</p>

              {camp ? (
                <p style={{ fontSize: '0.76rem', color: 'var(--gold-dim)', marginBottom: '10px', fontStyle: 'italic' }}>
                  ⚔️ Adventure in progress · {new Date(camp.last_played_at).toLocaleDateString()}
                </p>
              ) : (
                <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '10px', fontStyle: 'italic' }}>
                  No adventure started yet
                </p>
              )}

              <div className="char-actions">
                <button className="btn btn-gold btn-sm" onClick={() => handlePlay(char)}>
                  {camp ? 'Continue ▶' : 'Begin Adventure ⚔️'}
                </button>
              </div>
            </div>
          )
        })}

        {characters.length < slots && (
          <div className={`new-char-card${characters.length === 0 ? ' onboarding' : ''}`} onClick={onCreateChar}>
            {characters.length === 0 ? '✨ Create Your First Hero' : '+ New Character'}
          </div>
        )}

        {characters.length >= slots && (
          <div className="char-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, cursor: 'default', gap: '8px', minHeight: '120px' }}>
            <span>🔒</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              Unlock more slots in Upgrade
            </span>
          </div>
        )}
      </div>

      {characters.length === 0 && (
        <div style={{ marginTop: '24px' }}>
          {/* Welcome banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,168,67,0.08), rgba(136,85,204,0.08))',
            border: '1px solid var(--gold-dim)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 24px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>🎲</div>
            <h2 style={{ marginBottom: '10px', fontSize: '1.5rem' }}>Welcome to The Oracle's Table!</h2>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
              Your AI-powered Dungeon Master awaits — craft a hero, step into a living world, and let the story unfold with every choice you make.
              Every adventure is unique, shaped entirely by you.
            </p>
            {/* 3-step visual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {[
                { n: '1', label: 'Create your hero' },
                { arrow: true },
                { n: '2', label: 'Begin your adventure' },
                { arrow: true },
                { n: '3', label: 'Shape your legend' },
              ].map((item, i) =>
                item.arrow
                  ? <span key={i} style={{ color: 'var(--gold-dim)', fontSize: '1.2rem' }}>→</span>
                  : (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--purple)', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.n}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>{item.label}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
