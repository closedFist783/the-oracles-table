import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Stripe HMAC-SHA256 signature verification ──────────────────────────────
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')))
  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  const signed = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
  const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === sig
}

serve(async (req) => {
  const body     = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''
  const secret   = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  if (!(await verifyStripeSignature(body, sigHeader, secret))) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)

  // ── Only handle completed checkout sessions ───────────────────────────────
  if (event.type !== 'checkout.session.completed') {
    return new Response('Ignored', { status: 200 })
  }

  const session   = event.data.object
  const userId    = session.client_reference_id ?? session.metadata?.user_id
  const pType     = session.metadata?.product_type   // 'coins' | 'shards' | 'subscription'
  const coinsAmt  = parseInt(session.metadata?.coins  ?? '0')
  const shardsAmt = parseInt(session.metadata?.shards ?? '0')
  const subTier   = session.metadata?.tier            // 'wanderer' | 'adventurer' | 'archmage'

  if (!userId) return new Response('Missing user_id', { status: 400 })

  // ── Use service role key to bypass RLS ────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Fetch current profile ─────────────────────────────────────────────────
  const { data: profile, error: fetchErr } = await supabase
    .from('profiles').select('coins, character_slots').eq('id', userId).single()
  if (fetchErr || !profile) {
    console.error('Profile fetch failed:', fetchErr)
    return new Response('Profile not found', { status: 400 })
  }

  // ── Apply fulfillment ─────────────────────────────────────────────────────
  const updates: Record<string, number | string> = {}

  if (pType === 'coins') {
    updates.coins = profile.coins + coinsAmt
  } else if (pType === 'shards') {
    updates.character_slots = profile.character_slots + shardsAmt
  } else if (pType === 'subscription') {
    // Grant first-month coins immediately + tier + slot upgrades
    const TIER_SLOTS: Record<string, number> = { wanderer: 2, adventurer: 3, archmage: 5 }
    const newSlots = TIER_SLOTS[subTier ?? ''] ?? 1
    updates.coins             = profile.coins + coinsAmt
    updates.subscription_tier = subTier ?? ''
    // Only upgrade slots, never reduce (user may have bought extra shards)
    if (newSlots > profile.character_slots) updates.character_slots = newSlots
  }

  if (Object.keys(updates).length === 0) {
    console.warn('No updates for product_type:', pType)
    return new Response('No-op', { status: 200 })
  }

  const { error: updateErr } = await supabase
    .from('profiles').update(updates).eq('id', userId)

  if (updateErr) {
    console.error('Profile update failed:', updateErr)
    return new Response('Update failed', { status: 500 })
  }

  console.log(`Fulfilled ${pType} for user ${userId}:`, updates)
  return new Response('OK', { status: 200 })
})
