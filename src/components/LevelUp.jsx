import { useState, useEffect } from 'react'
import { CLASS_LEVELS, HIT_DICE, SUBCLASSES, spellSlots, profBonus } from '../lib/classes'

const STAT_NAMES = ['STR','DEX','CON','INT','WIS','CHA']
const STAT_KEYS  = ['str_stat','dex_stat','con_stat','int_stat','wis_stat','cha_stat']

function mod(n) { return Math.floor((n - 10) / 2) }
function modStr(n) { return n >= 0 ? `+${n}` : `${n}` }

export default function LevelUp({ character, newLevel, onComplete }) {
  const cls      = character.class
  const classData = CLASS_LEVELS[cls] || {}
  const levelEntry = classData[newLevel] || {}
  const newFeatures = levelEntry.features || []
  const choices     = levelEntry.choices  || []

  const [phase, setPhase]   = useState('animation') // animation → features → choices → done
  const [choiceIdx, setChoiceIdx] = useState(0)

  // ASI state
  const [asiMode, setAsiMode]   = useState('double') // 'double' | 'split'
  const [asiStat1, setAsiStat1] = useState(null)
  const [asiStat2, setAsiStat2] = useState(null)

  // Subclass / fighting style state
  const [picked, setPicked] = useState(null)

  // HP roll
  const hitDie = HIT_DICE[cls] ?? 8
  const conMod = mod(character.con_stat ?? 10)
  const avgHpGain = Math.floor(hitDie / 2) + 1 + conMod
  const [hpGain, setHpGain]   = useState(null)
  const [rolledHp, setRolledHp] = useState(false)

  useEffect(() => { setTimeout(() => setPhase('features'), 1800) }, [])

  const currentChoice = choices[choiceIdx]

  function rollHp() {
    const roll = Math.floor(Math.random() * hitDie) + 1
    const gain = Math.max(1, roll + conMod)
    setHpGain(gain)
    setRolledHp(true)
  }

  function nextChoice() {
    if (choiceIdx + 1 < choices.length) {
      setChoiceIdx(c => c + 1)
      setPicked(null)
    } else {
      finalize()
    }
  }

  function finalize() {
    // Build result
    const result = { newLevel, hpGain: hpGain ?? avgHpGain, newFeatures }
    if (choices.some(c => c.type === 'asi')) {
      result.asi = { mode: asiMode, stat1: asiStat1, stat2: asiStat2 }
    }
    if (choices.some(c => c.type === 'subclass')) result.subclass = picked
    if (choices.some(c => c.type === 'fighting_style')) result.fightingStyle = picked
    onComplete(result)
  }

  function canProceedFromChoice() {
    if (!currentChoice) return true
    if (currentChoice.type === 'asi') {
      if (asiMode === 'double') return asiStat1 !== null
      return asiStat1 !== null && asiStat2 !== null && asiStat1 !== asiStat2
    }
    return picked !== null
  }

  const newProf = profBonus(newLevel)
  const oldProf = profBonus(newLevel - 1)
  const slots   = spellSlots(cls, newLevel)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at center, #1a1200 0%, #0b0b10 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Animation phase */}
      {phase === 'animation' && (
        <div style={{ textAlign: 'center', animation: 'lvlUp 1.6s ease-out forwards' }}>
          <style>{`
            @keyframes lvlUp {
              0% { opacity:0; transform:scale(0.3); }
              60% { opacity:1; transform:scale(1.15); }
              100% { opacity:1; transform:scale(1); }
            }
            @keyframes shimmer {
              0%,100% { text-shadow:0 0 20px #c9a84c,0 0 40px #c9a84c; }
              50% { text-shadow:0 0 40px #ffd080,0 0 80px #ffd080,0 0 120px #c9a84c; }
            }
          `}</style>
          <div style={{ fontSize: '5rem', marginBottom: '8px' }}>✨</div>
          <div style={{ fontSize: '1rem', color: 'var(--text-dim)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px' }}>Level Up</div>
          <div style={{ fontSize: '7rem', fontWeight: 'bold', color: 'var(--gold)', lineHeight: 1, animation: 'shimmer 1.5s infinite' }}>
            {newLevel}
          </div>
          <div style={{ fontSize: '1.2rem', color: 'var(--text)', marginTop: '12px' }}>
            {character.name} · {cls}
          </div>
        </div>
      )}

      {/* Features phase */}
      {phase === 'features' && (
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Level {newLevel} Reached</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text)' }}>{character.name}</div>
          </div>

          {/* HP */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Hit Points</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
              Roll 1d{hitDie} {modStr(conMod)} CON ({conMod >= 0 ? '+' : ''}{conMod}) — or take the average
            </div>
            {!rolledHp ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-gold" onClick={rollHp}>🎲 Roll 1d{hitDie}</button>
                <button className="btn btn-ghost" onClick={() => { setHpGain(avgHpGain); setRolledHp(true) }}>
                  Take Average (+{avgHpGain} HP)
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gold)' }}>
                +{hpGain} HP {hpGain === avgHpGain ? '(average)' : '(rolled)'}
              </div>
            )}
          </div>

          {/* Proficiency bonus increase */}
          {newProf > oldProf && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid var(--gold-dim)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '12px', fontSize: '0.85rem' }}>
              ⬆ Proficiency bonus increases to <strong style={{ color: 'var(--gold)' }}>+{newProf}</strong>
            </div>
          )}

          {/* Spell slots */}
          {slots.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Spell Slots</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {slots.map((n, i) => n > 0 && (
                  <div key={i} style={{ background: 'var(--surface2)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', color: 'var(--text)' }}>
                    {['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'][i]}: {n}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New features */}
          {newFeatures.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>New Features</div>
              {newFeatures.map(f => (
                <div key={f.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--gold)', marginBottom: '4px' }}>{f.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{f.desc}</div>
                  {f.buff && <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '4px', fontFamily: 'monospace', background: 'var(--surface2)', borderRadius: '4px', padding: '3px 8px', display: 'inline-block' }}>{f.buff}</div>}
                </div>
              ))}
            </div>
          )}

          {newFeatures.length === 0 && !choices.length && (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '12px' }}>HP increase and proficiency bonus are your main gains this level.</div>
          )}

          <button className="btn btn-gold" style={{ width: '100%', marginTop: '8px' }}
            disabled={!rolledHp}
            onClick={() => choices.length > 0 ? setPhase('choices') : finalize()}>
            {choices.length > 0 ? 'Make Your Choices →' : '✓ Confirm Level Up'}
          </button>
        </div>
      )}

      {/* Choices phase */}
      {phase === 'choices' && currentChoice && (
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Choice {choiceIdx + 1} of {choices.length}
            </div>
          </div>

          {/* ASI */}
          {currentChoice.type === 'asi' && (
            <div>
              <h3 style={{ marginBottom: '6px' }}>Ability Score Improvement</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '16px' }}>
                +2 to one stat, or +1 to two different stats.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button className={`btn ${asiMode === 'double' ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                  onClick={() => { setAsiMode('double'); setAsiStat2(null) }}>+2 to one</button>
                <button className={`btn ${asiMode === 'split' ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                  onClick={() => setAsiMode('split')}>+1 to two</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {STAT_NAMES.map((s, i) => {
                  const val  = character[STAT_KEYS[i]] ?? 10
                  const isSel1 = asiStat1 === i
                  const isSel2 = asiStat2 === i
                  const maxed  = val >= 20
                  return (
                    <button key={s} disabled={maxed}
                      onClick={() => {
                        if (asiMode === 'double') { setAsiStat1(i) }
                        else if (asiStat1 === null || asiStat1 === i) { setAsiStat1(i) }
                        else { setAsiStat2(i) }
                      }}
                      style={{ padding: '14px 8px', borderRadius: 'var(--radius)', cursor: maxed ? 'not-allowed' : 'pointer',
                        background: isSel1 || isSel2 ? 'rgba(201,168,76,0.2)' : 'var(--surface)',
                        border: `2px solid ${isSel1 || isSel2 ? 'var(--gold)' : 'var(--border)'}`,
                        opacity: maxed ? 0.4 : 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{s}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--gold)' }}>{val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {isSel1 || isSel2 ? <span style={{ color: '#5d9' }}>+1 → {val + 1}</span> : modStr(mod(val))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Subclass */}
          {currentChoice.type === 'subclass' && (
            <div>
              <h3 style={{ marginBottom: '6px' }}>Choose Your Subclass</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '16px' }}>
                This choice shapes your abilities for the rest of your career.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(SUBCLASSES[cls] || []).map(opt => (
                  <button key={opt} onClick={() => setPicked(opt)}
                    style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--radius)', cursor: 'pointer',
                      background: picked === opt ? 'rgba(201,168,76,0.15)' : 'var(--surface)',
                      border: `2px solid ${picked === opt ? 'var(--gold)' : 'var(--border)'}`,
                      color: picked === opt ? 'var(--gold)' : 'var(--text)', fontWeight: picked === opt ? 'bold' : 'normal' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fighting Style */}
          {currentChoice.type === 'fighting_style' && (
            <div>
              <h3 style={{ marginBottom: '6px' }}>Choose a Fighting Style</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(currentChoice.options || []).map(opt => (
                  <button key={opt} onClick={() => setPicked(opt)}
                    style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--radius)', cursor: 'pointer',
                      background: picked === opt ? 'rgba(201,168,76,0.15)' : 'var(--surface)',
                      border: `2px solid ${picked === opt ? 'var(--gold)' : 'var(--border)'}`,
                      color: picked === opt ? 'var(--gold)' : 'var(--text)', fontWeight: picked === opt ? 'bold' : 'normal' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button className="btn btn-gold" style={{ flex: 1 }}
              disabled={!canProceedFromChoice()}
              onClick={nextChoice}>
              {choiceIdx + 1 < choices.length ? 'Next Choice →' : '✓ Confirm Level Up'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
