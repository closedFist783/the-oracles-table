import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AVATARS = [
  '🧙','⚔️','🛡️','🏹','🗡️','🔮','🧝','🧛','🐉','💀','🦅','🌙',
  '🔥','⚡','❄️','🌿','🌊','☀️','🌑','🗺️','🎲','📜','💎','👑',
  '🦁','🐺','🦊','🐻','🐗','🦄','🧟','👻','🧞','🧜','🧚','🧝',
]

const TIER_BADGE = {
  none:       { label: 'Free',       color: 'var(--text-dim)' },
  wanderer:   { label: '🌙 Wanderer',  color: '#a0c4ff' },
  adventurer: { label: '⚔️ Adventurer',color: 'var(--gold)' },
  archmage:   { label: '🔮 Archmage',  color: '#d4a8ff' },
}

export default function Profile({ user, profile, onProfileUpdate, onBack }) {
  const [stats, setStats]       = useState(null)
  const [editAvatar, setEditAvatar] = useState(false)
  const [editUsername, setEditUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return }
    setUploading(true); setError('')
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Upload failed: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = publicUrl + '?t=' + Date.now() // cache-bust
    const { error: saveErr } = await supabase.from('profiles').update({ avatar: url }).eq('id', user.id)
    if (!saveErr) { onProfileUpdate({ ...profile, avatar: url }); setEditAvatar(false) }
    else setError('Saved image but failed to update profile.')
    setUploading(false)
  }
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError]       = useState('')
  const [successMsg, setSuccess] = useState('')

  useEffect(() => { loadStats() }, [user?.id])

  async function loadStats() {
    if (!user?.id) return
    const [charsRes, campaignsRes, messagesRes] = await Promise.all([
      supabase.from('characters').select('id, xp, level').eq('user_id', user.id),
      supabase.from('campaigns').select('id').eq('user_id', user.id),
      supabase.from('campaign_messages').select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .in('campaign_id',
          (await supabase.from('campaigns').select('id').eq('user_id', user.id)).data?.map(c => c.id) ?? []
        ),
    ])
    const chars     = charsRes.data ?? []
    const totalXp   = chars.reduce((sum, c) => sum + (c.xp ?? 0), 0)
    const maxLevel  = chars.length ? Math.max(...chars.map(c => c.level ?? 1)) : 0
    setStats({
      characters:  chars.length,
      campaigns:   campaignsRes.data?.length ?? 0,
      turns:       messagesRes.count ?? 0,
      totalXp,
      maxLevel,
    })
  }

  useEffect(() => {
    if (!editUsername) return
    const val = newUsername.trim()
    setUsernameStatus(null)
    if (!val || val === profile?.username) return
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', val).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(t)
  }, [newUsername, editUsername])

  async function saveAvatar(emoji) {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ avatar: emoji }).eq('id', user.id)
    if (!error) { onProfileUpdate({ ...profile, avatar: emoji }); setEditAvatar(false) }
    setSaving(false)
  }

  async function saveUsername() {
    if (usernameStatus !== 'available' && newUsername.trim() !== profile?.username) {
      setError('Fix username before saving.'); return
    }
    setSaving(true); setError('')
    const { error } = await supabase.from('profiles').update({ username: newUsername.trim() }).eq('id', user.id)
    if (error) { setError(error.message) }
    else { onProfileUpdate({ ...profile, username: newUsername.trim() }); setEditUsername(false); setSuccess('Username updated!') }
    setSaving(false)
  }

  async function openPortal() {
    setPortalLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`https://vfrjyvbydmoubklqhlfv.supabase.co/functions/v1/create-portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else setError(json.error ?? 'Could not open subscription portal.')
    } catch (e) { setError('Could not open portal.') }
    setPortalLoading(false)
  }

  const tier = profile?.subscription_tier ?? 'none'
  const badge = TIER_BADGE[tier] ?? TIER_BADGE.none
  const avatar = profile?.avatar ?? '🧙'

  const statCards = stats ? [
    { icon: '👤', label: 'Characters', value: stats.characters },
    { icon: '🗺️', label: 'Campaigns',  value: stats.campaigns  },
    { icon: '💬', label: 'Adventures', value: stats.turns      },
    { icon: '⭐', label: 'Total XP',   value: stats.totalXp    },
    { icon: '🏆', label: 'Highest Level', value: stats.maxLevel },
    { icon: '🪙', label: 'Coins',      value: (profile?.coins ?? 0).toLocaleString() },
  ] : []

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      {error    && <div className="auth-error" style={{ marginBottom: '12px' }}>{error}</div>}
      {successMsg && <div style={{ background: 'rgba(93,200,100,0.1)', border: '1px solid #5d9', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '12px', fontSize: '0.85rem', color: '#5d9' }}>{successMsg}</div>}

      {/* Avatar + name card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <div
          onClick={() => setEditAvatar(v => !v)}
          style={{ cursor: 'pointer', userSelect: 'none',
            background: 'var(--surface2)', borderRadius: '50%', width: '72px', height: '72px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
            border: editAvatar ? '2px solid var(--gold)' : '2px solid transparent', transition: 'border 0.2s' }}
          title="Change avatar"
        >
          {avatar?.startsWith('http')
            ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{avatar}</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          {editUsername ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: 1, minWidth: '120px' }}
                value={newUsername} onChange={e => setNewUsername(e.target.value)}
                maxLength={20} placeholder="New username" autoFocus />
              <button className="btn btn-gold btn-sm" onClick={saveUsername} disabled={saving}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditUsername(false)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)' }}>
                {profile?.username ?? '(no username)'}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}
                onClick={() => { setNewUsername(profile?.username ?? ''); setEditUsername(true) }}>
                ✏️ Edit
              </button>
            </div>
          )}
          {usernameStatus && editUsername && (
            <div style={{ fontSize: '0.73rem', marginTop: '3px', color: usernameStatus === 'available' ? '#5d9' : usernameStatus === 'taken' ? 'var(--red)' : 'var(--text-dim)' }}>
              { usernameStatus === 'available' ? '✓ Available' : usernameStatus === 'taken' ? '✗ Taken' : usernameStatus === 'checking' ? '⏳ Checking…' : '3–20 chars, letters/numbers/underscore' }
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>{user?.email}</div>
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: badge.color,
              background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2px 10px' }}>
              {badge.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '8px' }}>
              {(profile?.character_slots ?? 1)} slots · {(profile?.coins ?? 0).toLocaleString()} coins
            </span>
          </div>
          {/* Slot breakdown */}
          {(() => {
            const BASE_SLOTS = { none:1, wanderer:2, adventurer:3, archmage:5 }
            const totalSlots = profile?.character_slots ?? 1
            const baseSlots  = BASE_SLOTS[profile?.subscription_tier ?? 'none'] ?? 1
            const extraSlots = Math.max(0, totalSlots - baseSlots)
            return (
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'6px' }}>
                <span style={{ fontSize:'0.72rem', background:'var(--surface2)', borderRadius:'6px', padding:'3px 10px', color:'var(--text-dim)' }}>
                  🏠 {baseSlots} base slot{baseSlots !== 1 ? 's' : ''}
                </span>
                {extraSlots > 0 && (
                  <span style={{ fontSize:'0.72rem', background:'rgba(201,168,76,0.1)', border:'1px solid var(--gold-dim)', borderRadius:'6px', padding:'3px 10px', color:'var(--gold)' }}>
                    💎 +{extraSlots} additional slot{extraSlots !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ fontSize:'0.72rem', background:'var(--surface2)', borderRadius:'6px', padding:'3px 10px', color:'var(--text)' }}>
                  {totalSlots} total
                </span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Avatar picker */}
      {editAvatar && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Choose an emoji or upload an image:</span>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
              <span className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? '⏳ Uploading…' : '📷 Upload Photo'}
              </span>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px' }}>
            {AVATARS.map(e => (
              <button key={e} onClick={() => saveAvatar(e)} disabled={saving}
                style={{ fontSize: '1.6rem', background: e === avatar ? 'var(--surface2)' : 'none',
                  border: e === avatar ? '1px solid var(--gold)' : '1px solid transparent',
                  borderRadius: '8px', cursor: 'pointer', padding: '6px', lineHeight: 1,
                  opacity: saving ? 0.5 : 1 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <h3 style={{ marginBottom: '14px', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Adventure Statistics
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--gold)' }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{s.label}</div>
          </div>
        ))}
        {!stats && <div style={{ gridColumn: '1/-1', color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>Loading stats…</div>}
      </div>

      {/* Subscription */}
      <h3 style={{ marginBottom: '14px', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Subscription
      </h3>
      <div className="card" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: badge.color }}>{badge.label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {tier === 'none'
                ? 'Free tier — upgrade for monthly coins and more character slots.'
                : `Active subscription · ${profile?.character_slots ?? 1} character slots`}
            </div>
          </div>
          {tier !== 'none' && (
            <button className="btn btn-ghost btn-sm" onClick={openPortal} disabled={portalLoading}
              style={{ whiteSpace: 'nowrap' }}>
              {portalLoading ? '…' : 'Manage'}
            </button>
          )}
        </div>
      </div>
      {tier !== 'none' && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={openPortal} disabled={portalLoading}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem',
              cursor: 'pointer', textDecoration: 'underline' }}>
            {portalLoading ? 'Opening…' : 'Cancel subscription'}
          </button>
        </div>
      )}

      {/* Danger Zone */}
      <h3 style={{ marginTop: '32px', marginBottom: '14px', fontSize: '0.9rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Danger Zone
      </h3>
      <DeleteAccount session={session} onDeleted={() => window.location.reload()} />
    </div>
  )
}

function DeleteAccount({ session, onDeleted }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setLoading(true); setError('')
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s?.access_token}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Deletion failed. Please try again.')
      await supabase.auth.signOut()
      onDeleted()
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ border: '1px solid var(--red)', background: 'rgba(176,48,48,0.05)' }}>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      {error && <p style={{ color: 'var(--red)', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</p>}
      {!confirm ? (
        <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
          🗑 Delete My Account
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--red)', fontWeight: 'bold' }}>
            Are you sure? All characters, progress, and data will be gone forever.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
