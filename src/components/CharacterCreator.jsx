import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { randomName } from '../lib/names'
import Anthropic from '@anthropic-ai/sdk'

const RACES = [
  { name: 'Human',      desc: 'Versatile and ambitious' },
  { name: 'Elf',        desc: 'Graceful, long-lived' },
  { name: 'Dwarf',      desc: 'Hardy and resilient' },
  { name: 'Halfling',   desc: 'Lucky and nimble' },
  { name: 'Dragonborn', desc: 'Draconic heritage' },
  { name: 'Gnome',      desc: 'Inventive and clever' },
  { name: 'Half-Elf',   desc: 'Between two worlds' },
  { name: 'Half-Orc',   desc: 'Fierce and enduring' },
  { name: 'Tiefling',   desc: 'Infernal bloodline' },
]

const CLASSES = [
  { name: 'Barbarian', desc: 'Primal rage' },
  { name: 'Bard',      desc: 'Magic through music' },
  { name: 'Cleric',    desc: 'Divine power' },
  { name: 'Druid',     desc: "Nature's wrath" },
  { name: 'Fighter',   desc: 'Master of combat' },
  { name: 'Monk',      desc: 'Ki and discipline' },
  { name: 'Paladin',   desc: 'Holy warrior' },
  { name: 'Ranger',    desc: 'Hunter of the wilds' },
  { name: 'Rogue',     desc: 'Shadow and cunning' },
  { name: 'Sorcerer',  desc: 'Innate magic' },
  { name: 'Warlock',   desc: 'Eldritch patron' },
  { name: 'Wizard',    desc: 'Arcane scholar' },
]

const BACKGROUNDS = [
  { name: 'Acolyte',       desc: 'Temple servant' },
  { name: 'Charlatan',     desc: 'Con artist' },
  { name: 'Criminal',      desc: 'Life outside the law' },
  { name: 'Entertainer',   desc: 'Born performer' },
  { name: 'Folk Hero',     desc: 'Champion of the people' },
  { name: 'Guild Artisan', desc: 'Skilled tradesperson' },
  { name: 'Hermit',        desc: 'Secluded seeker' },
  { name: 'Noble',         desc: 'Born to privilege' },
  { name: 'Outlander',     desc: 'Wanderer of the wilds' },
  { name: 'Sage',          desc: 'Scholar of lore' },
  { name: 'Sailor',        desc: 'Sea-hardened' },
  { name: 'Soldier',       desc: 'Battle-tested' },
  { name: 'Urchin',        desc: 'Street survivor' },
]

const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_KEYS  = ['str_stat', 'dex_stat', 'con_stat', 'int_stat', 'wis_stat', 'cha_stat']

// Normal: 4d6 drop lowest — average ~12.2
function rollNormal() {
  return Array.from({ length: 6 }, () => {
    const d = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    d.sort((a, b) => a - b)
    return d.slice(1).reduce((s, n) => s + n, 0)
  })
}

// Rigged: 3d6 straight — average ~10.5, looks like bad luck
function rollRigged() {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 3 }, () => Math.floor(Math.random() * 6) + 1)
      .reduce((s, n) => s + n, 0)
  )
}

function modStr(val) {
  const m = Math.floor((val - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

const HIT_DICE = {
  Barbarian: 12, Fighter: 10, Paladin: 10,
  Ranger: 8, Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
}

export default function CharacterCreator({ session, profile, onDone, onCancel, onCoinsChanged }) {
  const [step, setStep] = useState(0)
  const [race, setRace] = useState('')
  const [cls, setCls] = useState('')
  const [background, setBackground] = useState('')
  const [name, setName] = useState('')
  const [backstory, setBackstory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Backstory generator
  const [showBsGen, setShowBsGen]   = useState(false)
  const [bsKeywords, setBsKeywords] = useState('')
  const [genningBs, setGenningBs]   = useState(false)

  async function generateBackstory() {
    setGenningBs(true)
    try {
      const ai = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY, dangerouslyAllowBrowser: true })
      const seed = bsKeywords.trim()
      const prompt = seed
        ? `Write a short (3-4 sentence) D&D backstory for a level 1 ${race} ${cls} with the background of "${background}". Incorporate these elements: ${seed}. Write in second person ("You were born..."). Be evocative but concise.`
        : `Write a short (3-4 sentence) D&D backstory for a level 1 ${race} ${cls} with the background of "${background}". Write in second person ("You were born..."). Be evocative but concise.`
      const msg = await ai.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      })
      setBackstory(msg.content[0].text.trim())
      setShowBsGen(false)
      setBsKeywords('')
    } catch (e) {
      setError('Could not generate backstory.')
    }
    setGenningBs(false)
  }

  // Stat pools
  const [statPool, setStatPool] = useState([]) // unassigned scores
  const [assigned, setAssigned] = useState([null, null, null, null, null, null]) // per stat slot

  // Roll state
  const [hasRolled, setHasRolled] = useState(false)
  const [freeRerollUsed, setFreeRerollUsed] = useState(false)
  const [coins, setCoins] = useState(profile?.coins ?? 0)
  const [rerolling, setRerolling] = useState(false)

  // Tap-to-select state (works on mobile + desktop)
  const [selected, setSelected] = useState(null) // null | { value, source:'pool'|'stat', idx }

  const steps = ['Race', 'Class', 'Background', 'Stats', 'Details']
  const statsValid = assigned.every(v => v !== null)

  // ── Roll ──────────────────────────────────────────────────────────────────
  async function handleRoll() {
    if (rerolling) return
    let scores
    if (!hasRolled) {
      scores = rollNormal()
      setHasRolled(true)
    } else if (!freeRerollUsed) {
      scores = rollRigged()
      setFreeRerollUsed(true)
    } else {
      if (coins < 1) { setError('Not enough coins to reroll.'); return }
      setRerolling(true)
      const { error: err } = await supabase
        .from('profiles').update({ coins: coins - 1 }).eq('id', session.user.id)
      if (err) { setError('Could not deduct coin.'); setRerolling(false); return }
      setCoins(c => c - 1)
      onCoinsChanged?.()
      scores = rollNormal()
      setRerolling(false)
    }
    setStatPool(scores)
    setAssigned([null, null, null, null, null, null])
    setError('')
  }

  // ── Tap-to-select handlers (mobile + desktop) ────────────────────────────
  function handlePoolTap(val, poolIdx) {
    if (selected?.source === 'pool' && selected.idx === poolIdx) {
      setSelected(null) // deselect
    } else {
      setSelected({ value: val, source: 'pool', idx: poolIdx })
    }
  }

  function handleStatTap(statIdx) {
    if (!selected) {
      // Nothing selected — select this slot to move its value
      if (assigned[statIdx] !== null) setSelected({ value: assigned[statIdx], source: 'stat', idx: statIdx })
      return
    }
    const nextAssigned = [...assigned]
    const nextPool = [...statPool]
    if (selected.source === 'pool') {
      // Pool → Stat
      if (nextAssigned[statIdx] !== null) nextPool.push(nextAssigned[statIdx]) // return displaced value
      nextPool.splice(selected.idx, 1)
      nextAssigned[statIdx] = selected.value
    } else {
      // Stat → Stat swap
      const fromIdx = selected.idx
      if (selected.idx === statIdx) { setSelected(null); return } // tap same → deselect
      nextAssigned[fromIdx] = nextAssigned[statIdx]
      nextAssigned[statIdx] = selected.value
    }
    setAssigned(nextAssigned)
    setStatPool(nextPool)
    setSelected(null)
  }

  function handlePoolReturn(statIdx) {
    // Return assigned value back to pool
    if (assigned[statIdx] === null) return
    const nextAssigned = [...assigned]
    const nextPool = [...statPool, nextAssigned[statIdx]]
    nextAssigned[statIdx] = null
    setAssigned(nextAssigned)
    setStatPool(nextPool)
    setSelected(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) { setError('Give your hero a name.'); return }
    setSaving(true); setError('')
    const conMod = Math.floor(((assigned[2] ?? 10) - 10) / 2) // CON is slot index 2
    const hitDie = HIT_DICE[cls] ?? 8
    const maxHp  = hitDie + conMod
    const charData = {
      user_id: session.user.id,
      name: name.trim(), race, class: cls, background, level: 1, backstory,
      max_hp: Math.max(1, maxHp), current_hp: Math.max(1, maxHp), xp: 0,
    }
    STAT_KEYS.forEach((k, i) => { charData[k] = assigned[i] ?? 10 })
    const { error: err } = await supabase.from('characters').insert(charData)
    if (err) { setError(err.message); setSaving(false); return }
    onDone()
  }

  return (
    <div>
      <div className="section-header">
        <h2>Create Character</h2>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>

      <div className="creator-steps">
        {steps.map((s, i) => (
          <span key={s} className={`step-pill ${i === step ? 'active' : i < step ? 'done' : ''}`}>{s}</span>
        ))}
      </div>

      <div className="card">

        {/* ── Step 0: Race ── */}
        {step === 0 && (<>
          <h3 style={{ marginBottom: '16px' }}>Choose your Race</h3>
          <div className="race-grid">
            {RACES.map(r => (
              <div key={r.name} className={`pick-card ${race === r.name ? 'selected' : ''}`} onClick={() => setRace(r.name)}>
                <div className="pick-name">{r.name}</div>
                <div className="pick-desc">{r.desc}</div>
              </div>
            ))}
          </div>
          <div className="creator-nav">
            <span />
            <button className="btn btn-gold" disabled={!race} onClick={() => setStep(1)}>Next →</button>
          </div>
        </>)}

        {/* ── Step 1: Class ── */}
        {step === 1 && (<>
          <h3 style={{ marginBottom: '16px' }}>Choose your Class</h3>
          <div className="class-grid">
            {CLASSES.map(c => (
              <div key={c.name} className={`pick-card ${cls === c.name ? 'selected' : ''}`} onClick={() => setCls(c.name)}>
                <div className="pick-name">{c.name}</div>
                <div className="pick-desc">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="creator-nav">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-gold" disabled={!cls} onClick={() => setStep(2)}>Next →</button>
          </div>
        </>)}

        {/* ── Step 2: Background ── */}
        {step === 2 && (<>
          <h3 style={{ marginBottom: '16px' }}>Choose your Background</h3>
          <div className="bg-grid">
            {BACKGROUNDS.map(b => (
              <div key={b.name} className={`pick-card ${background === b.name ? 'selected' : ''}`} onClick={() => setBackground(b.name)}>
                <div className="pick-name">{b.name}</div>
                <div className="pick-desc">{b.desc}</div>
              </div>
            ))}
          </div>
          <div className="creator-nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-gold" disabled={!background} onClick={() => setStep(3)}>Next →</button>
          </div>
        </>)}

        {/* ── Step 3: Stats (tap to assign) ── */}
        {step === 3 && (<>
          <h3 style={{ marginBottom: '6px' }}>Roll & Assign Ability Scores</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '20px' }}>
            Roll your scores, then tap a number and tap a stat to assign it.
          </p>

          {/* Roll button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {!hasRolled ? (
              <button className="btn btn-gold" onClick={handleRoll}>🎲 Roll Stats</button>
            ) : !freeRerollUsed ? (
              <button className="btn btn-ghost" onClick={handleRoll}>
                🎲 Reroll &nbsp;<span style={{ color: 'var(--gold)' }}>Free</span>
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={handleRoll} disabled={coins < 1 || rerolling}>
                🎲 Reroll &nbsp;
                <span style={{ color: coins < 1 ? 'var(--red)' : 'var(--gold)' }}>
                  {rerolling ? '…' : '1 🪙'}
                </span>
              </button>
            )}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {!hasRolled && 'Roll to see your scores'}
              {hasRolled && !freeRerollUsed && '1 free reroll remaining'}
              {freeRerollUsed && `${coins} 🪙 remaining`}
            </span>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</p>}

          {hasRolled && (<>
            {/* Score pool */}
            <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Scores
            </div>
            <div style={{
              display: 'flex', gap: '10px', flexWrap: 'wrap',
              minHeight: '52px', padding: '10px 12px',
              background: 'var(--surface2)',
              border: `2px dashed var(--border)`,
              borderRadius: 'var(--radius)', marginBottom: '20px',
            }}>
              {statPool.length === 0
                ? <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem', alignSelf: 'center' }}>All scores assigned ✓</span>
                : statPool.map((val, i) => {
                  const isSel = selected?.source === 'pool' && selected.idx === i
                  return (
                    <div
                      key={i}
                      onClick={() => handlePoolTap(val, i)}
                      style={{
                        padding: '8px 18px',
                        background: isSel ? 'var(--gold)' : 'var(--surface)',
                        color: isSel ? '#1a1200' : 'var(--gold)',
                        border: `2px solid ${isSel ? 'var(--gold)' : 'var(--gold-dim)'}`,
                        borderRadius: 'var(--radius)', fontWeight: 'bold', fontSize: '1.1rem',
                        cursor: 'pointer', userSelect: 'none',
                        boxShadow: isSel ? '0 0 12px rgba(201,168,76,0.4)' : 'none',
                        transition: 'all 0.15s',
                        minWidth: '44px', textAlign: 'center',
                      }}
                    >
                      {val}
                    </div>
                  )
                })}
            </div>

            {/* Hint */}
            {selected && (
              <p style={{ fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '12px' }}>
                {selected.source === 'pool' ? `Tap a stat to assign ${selected.value}` : `Tap another stat to swap, or tap the same to deselect`}
              </p>
            )}

            {/* Stat slots */}
            <div className="stats-row" style={{ marginBottom: '8px' }}>
              {STAT_NAMES.map((stat, i) => {
                const val = assigned[i]
                const isSel = selected?.source === 'stat' && selected.idx === i
                const willReceive = selected !== null && !isSel
                return (
                  <div
                    key={stat}
                    className="stat-box"
                    onClick={() => handleStatTap(i)}
                    style={{
                      border: `2px ${val !== null ? 'solid' : 'dashed'} ${isSel ? 'var(--gold)' : willReceive && val !== null ? 'var(--gold-dim)' : val !== null ? 'var(--gold-dim)' : 'var(--border)'}`,
                      background: isSel ? 'rgba(201,168,76,0.12)' : willReceive ? 'rgba(201,168,76,0.04)' : undefined,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      minHeight: '80px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '2px',
                      boxShadow: isSel ? '0 0 10px rgba(201,168,76,0.25)' : 'none',
                    }}
                  >
                    <div className="stat-name">{stat}</div>
                    {val !== null ? (
                      <>
                        <div className="stat-value">{val}</div>
                        <div className="stat-mod">{modStr(val)}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: selected ? 'var(--gold-dim)' : 'var(--text-dim)' }}>
                        {selected ? 'tap to assign' : 'empty'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Clear all */}
            {assigned.some(v => v !== null) && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '8px' }}
                onClick={() => { setAssigned([null,null,null,null,null,null]); setStatPool(prev => [...prev, ...assigned.filter(v => v !== null)]); setSelected(null) }}
              >
                ↺ Clear All
              </button>
            )}
          </>)}

          <div className="creator-nav" style={{ marginTop: '24px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-gold" disabled={!statsValid} onClick={() => setStep(4)}>Next →</button>
          </div>
        </>)}

        {/* ── Step 4: Name + backstory ── */}
        {step === 4 && (<>
          <h3 style={{ marginBottom: '16px' }}>Name Your Hero</h3>
          {error && <div className="auth-error" style={{ marginBottom: '12px' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Character Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="form-input" style={{ flex: 1 }} value={name} onChange={e => setName(e.target.value)}
                placeholder={`Your ${race} ${cls}...`} autoFocus />
              <button className="btn btn-ghost btn-sm" type="button" title="Random name"
                onClick={() => setName(randomName())} style={{ whiteSpace: 'nowrap' }}>
                🎲 Random
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Backstory <span style={{ color: 'var(--text-dim)' }}>(optional)</span></span>
              <button className="btn btn-ghost btn-sm" type="button"
                onClick={() => setShowBsGen(v => !v)} style={{ fontSize: '0.75rem' }}>
                ✨ Generate
              </button>
            </label>
            {showBsGen && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Add keywords or a short description — or leave blank for a random backstory.
                </p>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={bsKeywords}
                  onChange={e => setBsKeywords(e.target.value)}
                  placeholder="e.g. grew up in the mountains, lost family to bandits, seeks revenge..."
                  style={{ marginBottom: '8px', fontSize: '0.82rem' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-gold btn-sm" type="button" disabled={genningBs} onClick={generateBackstory}>
                    {genningBs ? '✨ Writing...' : '✨ Generate'}
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setShowBsGen(false); setBsKeywords('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <textarea className="form-textarea" value={backstory} onChange={e => setBackstory(e.target.value)}
              placeholder="Where do you come from? What drives you? The GM will weave this into your adventure..." rows={4} />
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px', fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            <strong style={{ color: 'var(--gold)' }}>{name || '(unnamed)'}</strong>
            {' · '}Level 1 {race} {cls} · {background}
            <br />
            {STAT_NAMES.map((s, i) => `${s} ${assigned[i] ?? '?'}`).join(' · ')}
          </div>
          <div className="creator-nav">
            <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn-gold" disabled={!name.trim() || saving} onClick={handleSave}>
              {saving ? 'Creating...' : '⚔️ Create Hero'}
            </button>
          </div>
        </>)}

      </div>
    </div>
  )
}
