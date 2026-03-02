import { useState, useEffect, useRef } from 'react'
import { CLASS_LEVELS, HIT_DICE, SUBCLASSES, SUBCLASS_DESCRIPTIONS, FIGHTING_STYLE_DESCS, FEATS, spellSlots, profBonus } from '../lib/classes'
import { playLevelUp } from '../lib/sounds'

const STAT_NAMES = ['STR','DEX','CON','INT','WIS','CHA']
const STAT_KEYS  = ['str_stat','dex_stat','con_stat','int_stat','wis_stat','cha_stat']

function mod(n) { return Math.floor((n - 10) / 2) }
function modStr(n) { return n >= 0 ? `+${n}` : `${n}` }

function ParticleBurst() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const particles = []
    const colors = ['#ffd700','#c9a84c','#fff8e0','#ff9f40','#ffe066','#ffffff','#ffb347']
    for (let i = 0; i < 120; i++) {
      const angle  = Math.random() * Math.PI * 2
      const speed  = 3 + Math.random() * 7
      const size   = 2 + Math.random() * 5
      const type   = Math.random() > 0.5 ? 'circle' : 'star'
      particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - Math.random() * 2,
        alpha: 1, size, color: colors[Math.floor(Math.random() * colors.length)], type, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.3 })
    }
    let frame
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.98
        p.alpha -= 0.016; p.rot += p.spin
        if (p.alpha <= 0) return
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (p.type === 'star') {
          ctx.beginPath()
          for (let j = 0; j < 5; j++) {
            const a = (j * 4 * Math.PI) / 5 - Math.PI / 2
            const r = j % 2 === 0 ? p.size : p.size * 0.4
            j === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r)
          }
          ctx.closePath(); ctx.fill()
        } else {
          ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2); ctx.fill()
        }
        ctx.restore()
      })
      if (particles.some(p => p.alpha > 0)) frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} />
}

export default function LevelUp({ character, newLevel, remaining = 1, onComplete }) {
  const cls      = character.class
  const classData = CLASS_LEVELS[cls] || {}
  const levelEntry = classData[newLevel] || {}
  const newFeatures = levelEntry.features || []
  const choices     = levelEntry.choices  || []

  const [phase, setPhase]   = useState('animation') // animation → features → choices → done
  const [choiceIdx, setChoiceIdx] = useState(0)

  // ASI state
  const [asiMode, setAsiMode]   = useState('double') // 'double' | 'split' | 'feat'
  const [asiStat1, setAsiStat1] = useState(null)
  const [asiStat2, setAsiStat2] = useState(null)
  const [featName, setFeatName] = useState('')

  const allMaxed = STAT_KEYS.every(k => (character[k] ?? 10) >= 20)
  // Auto-switch to feat mode if all stats are 20
  useEffect(() => { if (allMaxed) setAsiMode('feat') }, [allMaxed])

  // Subclass / fighting style state
  const [picked, setPicked] = useState(null)

  // HP roll
  const hitDie = HIT_DICE[cls] ?? 8
  const conMod = mod(character.con_stat ?? 10)
  const avgHpGain = Math.floor(hitDie / 2) + 1 + conMod
  const [hpGain, setHpGain]   = useState(null)
  const [rolledHp, setRolledHp] = useState(false)

  useEffect(() => { playLevelUp(); setTimeout(() => setPhase('features'), 1800) }, [])

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
      result.asi = { mode: asiMode, stat1: asiStat1, stat2: asiStat2, feat: asiMode === 'feat' ? featName.trim() : null }
    }
    if (choices.some(c => c.type === 'subclass')) result.subclass = picked
    if (choices.some(c => c.type === 'fighting_style')) result.fightingStyle = picked
    onComplete(result)
  }

  function canProceedFromChoice() {
    if (!currentChoice) return true
    if (currentChoice.type === 'asi') {
      if (asiMode === 'feat') return featName.trim().length > 0
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
        <div style={{ position:'relative', textAlign:'center', width:'100%', maxWidth:'480px' }}>
          <style>{`
            @keyframes lvlBurst {
              0%   { opacity:0; transform:scale(0.1) rotate(-15deg); }
              50%  { opacity:1; transform:scale(1.25) rotate(3deg); }
              70%  { transform:scale(0.95) rotate(-1deg); }
              100% { opacity:1; transform:scale(1) rotate(0deg); }
            }
            @keyframes lvlSub {
              0%   { opacity:0; transform:translateY(20px); }
              60%  { opacity:0; transform:translateY(20px); }
              100% { opacity:1; transform:translateY(0); }
            }
            @keyframes goldPulse {
              0%,100% { text-shadow:0 0 30px #c9a84c, 0 0 60px #c9a84c, 0 0 2px #fff8e0; }
              50%     { text-shadow:0 0 60px #ffd700, 0 0 120px #ffd700, 0 0 200px #ffb347, 0 0 4px #ffffff; }
            }
            @keyframes ringPulse {
              0%   { transform:scale(0.5); opacity:0.8; }
              100% { transform:scale(2.5); opacity:0; }
            }
            @keyframes badgePop {
              0%   { transform:scale(0); opacity:0; }
              70%  { transform:scale(1.1); opacity:1; }
              100% { transform:scale(1); opacity:1; }
            }
          `}</style>

          <ParticleBurst />

          {/* Ring pulse */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:'160px', height:'160px', borderRadius:'50%',
              border:'3px solid #c9a84c', animation:'ringPulse 1s ease-out 0.1s both' }} />
            <div style={{ position:'absolute', width:'200px', height:'200px', borderRadius:'50%',
              border:'2px solid #c9a84c', animation:'ringPulse 1s ease-out 0.3s both' }} />
          </div>

          {/* Level number */}
          <div style={{ position:'relative', animation:'lvlBurst 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div style={{ fontSize:'0.85rem', color:'#c9a84c', letterSpacing:'0.4em', textTransform:'uppercase',
              marginBottom:'4px', fontWeight:'bold', opacity:0.9 }}>
              LEVEL UP
            </div>
            <div style={{ fontSize:'9rem', fontWeight:'900', lineHeight:1, color:'#ffd700',
              animation:'goldPulse 1.2s ease-in-out 0.5s infinite',
              textShadow:'0 0 40px #c9a84c, 0 0 80px #c9a84c' }}>
              {newLevel}
            </div>
          </div>

          {/* Name / class */}
          <div style={{ animation:'lvlSub 1s ease-out forwards' }}>
            <div style={{ fontSize:'1.1rem', color:'var(--text)', fontWeight:'bold', marginTop:'4px' }}>
              {character.name}
            </div>
            <div style={{ fontSize:'0.85rem', color:'var(--text-dim)', marginTop:'2px' }}>
              {cls} · Level {newLevel}
            </div>
            {remaining > 1 && (
              <div style={{ marginTop:'10px', display:'inline-block', background:'rgba(201,168,76,0.15)',
                border:'1px solid var(--gold-dim)', borderRadius:'20px', padding:'4px 14px',
                fontSize:'0.75rem', color:'var(--gold)', animation:'badgePop 0.4s ease-out 0.9s both' }}>
                +{remaining - 1} more level{remaining > 2 ? 's' : ''} to go
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features phase */}
      {phase === 'features' && (
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Level {newLevel} Reached {remaining > 1 && <span style={{ background:'rgba(201,168,76,0.2)', borderRadius:'10px', padding:'1px 8px', marginLeft:'6px' }}>{remaining} levels remaining</span>}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text)' }}>{character.name} · {cls}</div>
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
              {allMaxed && (
                <div style={{ background: 'rgba(109,62,176,0.15)', border: '1px solid var(--purple)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  All your stats are at 20 — you must take a feat instead.
                </div>
              )}
              {!allMaxed && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button className={`btn ${asiMode === 'double' ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                    onClick={() => { setAsiMode('double'); setAsiStat2(null) }}>+2 to one stat</button>
                  <button className={`btn ${asiMode === 'split' ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                    onClick={() => { setAsiMode('split'); setAsiStat1(null); setAsiStat2(null) }}>+1 to two stats</button>
                  <button className={`btn ${asiMode === 'feat' ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                    onClick={() => setAsiMode('feat')}>🎓 Take a Feat</button>
                </div>
              )}

              {/* Stat grid — hidden in feat mode */}
              {asiMode !== 'feat' && !allMaxed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '8px' }}>
                  {STAT_NAMES.map((s, i) => {
                    const val    = character[STAT_KEYS[i]] ?? 10
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
                          opacity: maxed ? 0.35 : 1 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{s}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--gold)' }}>{val}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {isSel1 || isSel2 ? <span style={{ color: '#5d9' }}>+1 → {val + 1}</span> : modStr(mod(val))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Feat picker */}
              {(asiMode === 'feat' || allMaxed) && (() => {
                const available = FEATS.filter(f => !f.prereqFn || f.prereqFn(character))
                const unavailable = FEATS.filter(f => f.prereqFn && !f.prereqFn(character))
                return (
                  <div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '10px' }}>
                      Choose a feat — it'll be added to your Abilities tab and honored in play.
                    </p>
                    <div style={{ maxHeight: '42vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                      {available.map(f => {
                        const isSel = featName === f.name
                        return (
                          <button key={f.name} onClick={() => setFeatName(f.name)}
                            style={{ padding: '10px 14px', textAlign: 'left', borderRadius: 'var(--radius)', cursor: 'pointer',
                              background: isSel ? 'rgba(201,168,76,0.12)' : 'var(--surface)',
                              border: `2px solid ${isSel ? 'var(--gold)' : 'var(--border)'}`,
                              transition: 'all 0.12s' }}>
                            <div style={{ fontWeight: 'bold', color: isSel ? 'var(--gold)' : 'var(--text)', marginBottom: '3px', fontSize: '0.9rem' }}>{f.name}</div>
                            <div style={{ fontSize: '0.77rem', color: isSel ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.4 }}>{f.desc}</div>
                          </button>
                        )
                      })}
                      {unavailable.length > 0 && (<>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '8px 4px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Requires prerequisites
                        </div>
                        {unavailable.map(f => (
                          <div key={f.name} style={{ padding: '10px 14px', borderRadius: 'var(--radius)', opacity: 0.45,
                            background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: '3px', fontSize: '0.9rem' }}>{f.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>{f.desc}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--gold-dim)', fontStyle: 'italic' }}>Requires: {f.prereq}</div>
                          </div>
                        ))}
                      </>)}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Subclass */}
          {currentChoice.type === 'subclass' && (
            <div>
              <h3 style={{ marginBottom: '4px' }}>Choose Your Subclass</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '14px' }}>
                This choice shapes your abilities for the rest of your career.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {(SUBCLASSES[cls] || []).map(opt => {
                  const isSelected = picked === opt
                  const desc = SUBCLASS_DESCRIPTIONS[opt]
                  return (
                    <button key={opt} onClick={() => setPicked(opt)}
                      style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--radius)', cursor: 'pointer',
                        background: isSelected ? 'rgba(201,168,76,0.12)' : 'var(--surface)',
                        border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                        transition: 'all 0.15s' }}>
                      <div style={{ fontWeight: 'bold', color: isSelected ? 'var(--gold)' : 'var(--text)', marginBottom: desc ? '4px' : 0 }}>
                        {opt}
                      </div>
                      {desc && <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.4 }}>{desc}</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Fighting Style */}
          {currentChoice.type === 'fighting_style' && (
            <div>
              <h3 style={{ marginBottom: '4px' }}>Choose a Fighting Style</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '14px' }}>
                A permanent specialty that shapes your combat approach.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(currentChoice.options || []).map(opt => {
                  const isSelected = picked === opt
                  // Name is before the first '(' or '+'
                  const name = opt.split(/\s*[\(+]/)[0].trim()
                  const desc = FIGHTING_STYLE_DESCS[opt] || opt
                  return (
                    <button key={opt} onClick={() => setPicked(opt)}
                      style={{ padding: '12px 16px', textAlign: 'left', borderRadius: 'var(--radius)', cursor: 'pointer',
                        background: isSelected ? 'rgba(201,168,76,0.12)' : 'var(--surface)',
                        border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                        transition: 'all 0.15s' }}>
                      <div style={{ fontWeight: 'bold', color: isSelected ? 'var(--gold)' : 'var(--text)', marginBottom: '4px' }}>{name}</div>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.4 }}>{desc}</div>
                    </button>
                  )
                })}
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
