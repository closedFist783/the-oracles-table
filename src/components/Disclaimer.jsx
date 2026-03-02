import { useState } from 'react'

const KEY = 'ot_disclaimer_seen'

export default function Disclaimer() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(KEY))

  if (!visible) return null

  function accept() {
    localStorage.setItem(KEY, '1')
    setVisible(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
        animation: 'fadeInUp 0.25s ease',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚠️</div>
        <h2 style={{ marginBottom: '12px', fontSize: '1.3rem' }}>Early Access</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '18px', lineHeight: '1.5' }}>
          The Oracle's Table is an independent solo project, currently in active development.
        </p>
        <ul style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.8', paddingLeft: '0', listStyle: 'none', marginBottom: '20px' }}>
          <li>• Features may change or break without notice</li>
          <li>• This is not affiliated with Wizards of the Coast or Dungeons &amp; Dragons</li>
          <li>• D&amp;D 5e rules are used as inspiration; this is not an official product</li>
          <li>• Your data and progress may be reset during major updates (we'll warn you)</li>
          <li>• AI responses are generated and may occasionally be inaccurate or unexpected</li>
        </ul>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '20px', fontStyle: 'italic' }}>
          By continuing, you acknowledge this is an early-access work in progress.
        </p>
        <button className="btn btn-gold" style={{ width: '100%', padding: '12px' }} onClick={accept}>
          Got it, let's play! →
        </button>
      </div>
    </div>
  )
}
