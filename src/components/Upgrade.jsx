import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Replace these with your real Stripe Price IDs from the Stripe Dashboard ──
// Stripe Dashboard → Products → Create product → Add price → copy "Price ID"
const PRICES = {
  // One-time coin packs
  coins_50:   { priceId: 'price_1T6NV2JTVSSOOaY3keqjaFxF', mode: 'payment', meta: { product_type: 'coins',  coins: '50'   } },
  coins_150:  { priceId: 'price_1T6OBmJTVSSOOaY37ya8Ad0M', mode: 'payment', meta: { product_type: 'coins', coins: '150'  } },
  coins_400:  { priceId: 'price_1T6ODjJTVSSOOaY3leBVuKOR', mode: 'payment', meta: { product_type: 'coins', coins: '400'  } },
  coins_1000: { priceId: 'price_1T6OEeJTVSSOOaY3PdXqjGYm', mode: 'payment', meta: { product_type: 'coins', coins: '1000' } },
  // One-time shard packs
  shards_1:   { priceId: 'price_1T6OPQJTVSSOOaY3iVnFp2gX',  mode: 'payment',      meta: { product_type: 'shards', shards: '1'   } },
  shards_3:   { priceId: 'price_1T6ORjJTVSSOOaY3web7V7xV',  mode: 'payment',      meta: { product_type: 'shards', shards: '3'   } },
  shards_6:   { priceId: 'price_1T6OSVJTVSSOOaY332OLJMN5',  mode: 'payment',      meta: { product_type: 'shards', shards: '6'   } },
  // Subscriptions (recurring prices in Stripe)
  sub_wanderer:   { priceId: 'price_1T6OYIJTVSSOOaY3xXNzV5z2', mode: 'subscription', meta: { product_type: 'subscription', tier: 'wanderer',   coins: '200' } },
  sub_adventurer: { priceId: 'price_1T6OZvJTVSSOOaY3qUTtIQQc', mode: 'subscription', meta: { product_type: 'subscription', tier: 'adventurer', coins: '450' } },
  sub_archmage:   { priceId: 'price_1T6ObjJTVSSOOaY3bFFFH8A3', mode: 'subscription', meta: { product_type: 'subscription', tier: 'archmage',   coins: '1000'} },
}

const TIER_ORDER = ['none', 'wanderer', 'adventurer', 'archmage']
const tierRank = t => TIER_ORDER.indexOf(t ?? 'none')

async function openPortal(session) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const res = await fetch('https://vfrjyvbydmoubklqhlfv.supabase.co/functions/v1/create-portal', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl: window.location.href }),
  })
  const json = await res.json()
  if (json.url) window.location.href = json.url
  else alert(json.error ?? 'Could not open subscription portal.')
}

export default function Upgrade({ session, profile, onBack }) {
  const [loading, setLoading] = useState(null) // key of item currently buying

  async function handlePurchase(key) {
    const product = PRICES[key]
    if (!product) return
    setLoading(key)
    try {
      const origin = window.location.origin
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId:    product.priceId,
          mode:       product.mode,
          metadata:   product.meta,
          userId:     session?.user?.id,
          successUrl: `${origin}/?stripe=success&product=${encodeURIComponent(key)}`,
          cancelUrl:  `${origin}/?stripe=canceled`,
        },
      })
      if (error || !data?.url) throw new Error(error?.message ?? 'No checkout URL returned')
      window.location.href = data.url
    } catch (err) {
      alert(`Checkout failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }

  const BuyBtn = ({ productKey, label = 'Buy', subLabel = null }) => {
    const isLoading = loading === productKey
    return (
      <button
        className="btn btn-gold btn-sm"
        style={{ width: '100%' }}
        onClick={() => handlePurchase(productKey)}
        disabled={!!loading}
      >
        {isLoading ? '⏳ Redirecting…' : (subLabel ?? label)}
      </button>
    )
  }

  return (
    <div>
      <div className="section-header">
        <h2>⚗️ Upgrade</h2>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
      </div>

      <p style={{ color: 'var(--text-dim)', marginBottom: '28px' }}>
        Expand your adventure. You have{' '}
        <strong style={{ color: 'var(--gold)' }}>{profile?.coins ?? 0} coins</strong> and{' '}
        <strong style={{ color: 'var(--gold)' }}>{profile?.character_slots ?? 1} character slot{profile?.character_slots !== 1 ? 's' : ''}</strong>.
      </p>

      {/* ── Coin Packs ─────────────────────────────────────────── */}
      <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}>🪙 Coin Packs</h3>
      <div className="upgrade-grid" style={{ marginBottom: '36px' }}>
        {[
          { key: 'coins_50',   coins: 50,   price: '$1.99',  icon: '🗡️', name: "Adventurer's Pouch" },
          { key: 'coins_150',  coins: 150,  price: '$4.99',  icon: '⚔️', name: "Hero's Chest",      badge: '🔥 Most Popular', featured: true },
          { key: 'coins_400',  coins: 400,  price: '$9.99',  icon: '🛡️', name: "Champion's Reward" },
          { key: 'coins_1000', coins: 1000, price: '$19.99', icon: '🐉', name: "Dragon's Hoard",     badge: '💎 Best Value',  featured: true },
        ].map(p => (
          <div key={p.key} className={`upgrade-card ${p.featured ? 'featured' : ''}`}>
            <div className="uc-icon">{p.icon}</div>
            <div className="uc-name">{p.name}</div>
            <div className="uc-desc">
              {p.coins.toLocaleString()} coins
              <div style={{ minHeight: '18px', marginTop: '4px' }}>
                {p.badge && <span style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 'bold' }}>{p.badge}</span>}
              </div>
            </div>
            <div className="uc-price">{p.price}</div>
            <BuyBtn productKey={p.key} />
          </div>
        ))}
      </div>

      {/* ── Character Slots ────────────────────────────────────── */}
      <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}>💎 Character Slots</h3>
      <div className="upgrade-grid" style={{ marginBottom: '36px' }}>
        {[
          { key: 'shards_1', slots: 1, price: '$1.99', was: null,     icon: '💎'           },
          { key: 'shards_3', slots: 3, price: '$4.99', was: '$5.97',  icon: '💎💎💎'       },
          { key: 'shards_6', slots: 6, price: '$8.99', was: '$11.94', icon: '💎💎💎💎💎💎' },
        ].map(p => (
          <div key={p.key} className="upgrade-card">
            <div className="uc-icon" style={{ fontSize: '1.4rem', letterSpacing: '-2px' }}>{p.icon}</div>
            <div className="uc-name">+{p.slots} Character Slot{p.slots > 1 ? 's' : ''}</div>
            <div className="uc-price">
              {p.was && <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: '0.82rem', marginRight: '6px' }}>{p.was}</span>}
              {p.price}
            </div>
            <BuyBtn productKey={p.key} />
          </div>
        ))}
      </div>

      {/* ── Subscriptions ──────────────────────────────────────── */}
      <h3 style={{ marginBottom: '4px', fontSize: '1rem' }}>🌟 Subscription</h3>
      {profile?.subscription_tier && profile.subscription_tier !== 'none' && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
          Active plan: <strong style={{ color: 'var(--gold)', textTransform: 'capitalize' }}>{profile.subscription_tier}</strong>
          {' — '}to downgrade, cancel your current subscription in Stripe first.
        </p>
      )}
      {profile?.subscription_tier && profile.subscription_tier !== 'none' && (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <button onClick={() => openPortal(session)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Manage or cancel subscription
          </button>
        </div>
      )}
      {(!profile?.subscription_tier || profile.subscription_tier === 'none') && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '14px' }}>Choose a plan to get monthly coins and unlock character slots.</p>
      )}
      <div className="upgrade-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '20px' }}>
        {[
          {
            key: 'sub_wanderer', tier: 'wanderer', name: 'Wanderer', price: '$4.99/mo', icon: '🌙',
            perks: ['200 coins / month', '2 base character slots', ],
          },
          {
            key: 'sub_adventurer', tier: 'adventurer', name: 'Adventurer', price: '$7.99/mo', icon: '⚔️',
            perks: ['450 coins / month', '3 base character slots', '1 new character slot / month', ],
            featured: true, badge: '🔥 Most Popular',
          },
          {
            key: 'sub_archmage', tier: 'archmage', name: 'Archmage', price: '$15.99/mo', icon: '🔮',
            perks: ['1,000 coins / month', '5 base character slots', '2 new character slots / month', 'Priority GM quality'],
            badge: '💎 Best Value',
          },
        ].map(p => {
          const currentRank = tierRank(profile?.subscription_tier)
          const thisRank    = tierRank(p.tier)
          const isCurrent   = currentRank === thisRank && thisRank > 0
          const isLower     = thisRank < currentRank
          const isDisabled  = isCurrent || isLower
          return (
            <div key={p.key} className={`upgrade-card ${p.featured ? 'featured' : ''}`}
              style={{ opacity: isDisabled ? 0.55 : 1, position: 'relative' }}>
              {isCurrent && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.65rem',
                  background: 'var(--gold)', color: '#1a1200', borderRadius: '4px', padding: '2px 6px', fontWeight: 'bold' }}>
                  ACTIVE
                </div>
              )}
              <div className="uc-icon">{p.icon}</div>
              <div className="uc-name">{p.name}</div>
              {p.badge && (
                <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 'bold', marginBottom: '8px' }}>{p.badge}</div>
              )}
              <div className="uc-desc" style={{ textAlign: 'left' }}>
                {p.perks.map(pk => (
                  <div key={pk} style={{ marginBottom: '3px', display: 'flex', gap: '5px' }}>
                    <span style={{ color: isCurrent ? 'var(--gold)' : isLower ? 'var(--text-dim)' : 'var(--gold)', flexShrink: 0 }}>✓</span>
                    <span>{pk}</span>
                  </div>
                ))}
              </div>
              <div className="uc-price" style={{ marginTop: '12px' }}>{p.price}</div>
              {isCurrent ? (
                <button className="btn btn-ghost btn-sm" disabled style={{ width: '100%', marginTop: '8px', opacity: 0.6 }}>Current Plan</button>
              ) : isLower ? (
                <button className="btn btn-ghost btn-sm" disabled style={{ width: '100%', marginTop: '8px', opacity: 0.4 }}>Lower Plan</button>
              ) : (
                <BuyBtn productKey={p.key} subLabel={currentRank > 0 ? 'Upgrade' : 'Subscribe'} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
