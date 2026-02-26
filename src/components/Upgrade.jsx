import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Replace these with your real Stripe Price IDs from the Stripe Dashboard ──
// Stripe Dashboard → Products → Create product → Add price → copy "Price ID"
const PRICES = {
  // One-time coin packs
  coins_50:   { priceId: 'price_1T4w6XCZ0RoZVqTw4ALrmnVg',   mode: 'payment',      meta: { product_type: 'coins',  coins: '50'   } },
  coins_150:  { priceId: 'price_1T4w7CCZ0RoZVqTwmRc9myzh',   mode: 'payment',      meta: { product_type: 'coins',  coins: '150'  } },
  coins_400:  { priceId: 'price_1T4w7WCZ0RoZVqTwyRfm43wm',  mode: 'payment',      meta: { product_type: 'coins',  coins: '400'  } },
  coins_1000: { priceId: 'price_1T4w7rCZ0RoZVqTwP0RPpCQE',   mode: 'payment',      meta: { product_type: 'coins',  coins: '1000' } },
  // One-time shard packs
  shards_1:   { priceId: 'price_1T4w8TCZ0RoZVqTw0LCvZP1G',  mode: 'payment',      meta: { product_type: 'shards', shards: '1'   } },
  shards_3:   { priceId: 'price_1T4w8rCZ0RoZVqTw2VwM8oY5',  mode: 'payment',      meta: { product_type: 'shards', shards: '3'   } },
  shards_6:   { priceId: 'price_1T4w9GCZ0RoZVqTwaK39XWjD',  mode: 'payment',      meta: { product_type: 'shards', shards: '6'   } },
  // Subscriptions (recurring prices in Stripe)
  sub_wanderer:   { priceId: 'price_1T4w9rCZ0RoZVqTwGqT75Fil', mode: 'subscription', meta: { product_type: 'subscription', tier: 'wanderer',   coins: '200' } },
  sub_adventurer: { priceId: 'price_1T4wAWCZ0RoZVqTw2O4yoAnl', mode: 'subscription', meta: { product_type: 'subscription', tier: 'adventurer', coins: '450' } },
  sub_archmage:   { priceId: 'price_1T4wBFCZ0RoZVqTwijF7pa66', mode: 'subscription', meta: { product_type: 'subscription', tier: 'archmage',   coins: '1000'} },
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

      {/* ── Character Shards ───────────────────────────────────── */}
      <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>✨ Character Shards</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
        Each shard unlocks one additional character slot. Collect multiple heroes.
      </p>
      <div className="upgrade-grid" style={{ marginBottom: '36px' }}>
        {[
          { key: 'shards_1', shards: 1, price: '$1.99', icon: '💎',                          note: null     },
          { key: 'shards_3', shards: 3, price: '$4.99', icon: '💎💎💎',                      note: 'Save $1' },
          { key: 'shards_6', shards: 6, price: '$8.99', icon: '💎💎💎💎💎💎',               note: 'Save $3' },
        ].map(p => (
          <div key={p.key} className="upgrade-card">
            <div className="uc-icon" style={{ fontSize: '1.4rem', letterSpacing: '-2px' }}>{p.icon}</div>
            <div className="uc-name">{p.shards} Shard{p.shards > 1 ? 's' : ''}</div>
            <div className="uc-desc">
              +{p.shards} character slot{p.shards > 1 ? 's' : ''}
              <div style={{ minHeight: '18px', marginTop: '4px' }}>
                {p.note && <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 'bold' }}>{p.note}</span>}
              </div>
            </div>
            <div className="uc-price">{p.price}</div>
            <BuyBtn productKey={p.key} />
          </div>
        ))}
      </div>

      {/* ── Subscriptions ──────────────────────────────────────── */}
      <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}>🌟 Subscription</h3>
      <div className="upgrade-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '20px' }}>
        {[
          {
            key: 'sub_wanderer', name: 'Wanderer', price: '$4.99/mo', icon: '🌙',
            perks: ['200 coins / month', 'Rollover up to 100 coins', 'Exclusive lore drops'],
          },
          {
            key: 'sub_adventurer', name: 'Adventurer', price: '$7.99/mo', icon: '⚔️',
            perks: ['450 coins / month', '1 character shard / month', 'Rollover up to 200 coins', 'All Wanderer perks'],
            featured: true, badge: '🔥 Most Popular',
          },
          {
            key: 'sub_archmage', name: 'Archmage', price: '$12.99/mo', icon: '🔮',
            perks: ['1,000 coins / month', '2 character shards / month', 'Unlimited coin rollover', 'Priority GM quality', 'All Adventurer perks'],
            badge: '💎 Best Value',
          },
        ].map(p => (
          <div key={p.key} className={`upgrade-card ${p.featured ? 'featured' : ''}`}>
            <div className="uc-icon">{p.icon}</div>
            <div className="uc-name">{p.name}</div>
            {p.badge && (
              <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 'bold', marginBottom: '8px' }}>{p.badge}</div>
            )}
            <div className="uc-desc" style={{ textAlign: 'left' }}>
              {p.perks.map(pk => (
                <div key={pk} style={{ marginBottom: '3px', display: 'flex', gap: '5px' }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0 }}>✓</span>
                  <span>{pk}</span>
                </div>
              ))}
            </div>
            <div className="uc-price" style={{ marginTop: '12px' }}>{p.price}</div>
            <BuyBtn productKey={p.key} subLabel="Subscribe" />
          </div>
        ))}
      </div>
    </div>
  )
}
