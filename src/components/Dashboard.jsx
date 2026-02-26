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

  async function deleteCharacter(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this character and their adventure?')) return
    await supabase.from('characters').delete().eq('id', id)
    loadData()
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
                <button className="btn btn-danger btn-sm" onClick={e => deleteCharacter(char.id, e)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}

        {characters.length < slots && (
          <div className="new-char-card" onClick={onCreateChar}>
            + New Character
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
        <div className="empty-state" style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎲</div>
          <p>No characters yet. Create one to begin your adventure.</p>
        </div>
      )}
    </div>
  )
}
