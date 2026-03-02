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

// Monthly grants per tier
const TIER_COINS: Record<string, number> = {
  wanderer: 200, adventurer: 450, archmage: 1000,
}
const TIER_MONTHLY_SLOTS: Record<string, number> = {
  wanderer: 0, adventurer: 1, archmage: 2,
}
const TIER_BASE_SLOTS: Record<string, number> = {
  wanderer: 2, adventurer: 3, archmage: 5,
}

serve(async (req) => {
  const body      = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''
  const secret    = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  if (secret && !(await verifyStripeSignature(body, sigHeader, secret))) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── checkout.session.completed — initial purchase fulfillment ──────────────
  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object
    const userId    = session.client_reference_id ?? session.metadata?.user_id
    const pType     = session.metadata?.product_type
    const coinsAmt  = parseInt(session.metadata?.coins  ?? '0')
    const shardsAmt = parseInt(session.metadata?.shards ?? '0')
    const subTier   = session.metadata?.tier

    if (!userId) return new Response('Missing user_id', { status: 400 })

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles').select('coins, character_slots, subscription_tier').eq('id', userId).single()
    if (fetchErr || !profile) return new Response('Profile not found', { status: 400 })

    const updates: Record<string, number | string> = {}

    if (pType === 'coins') {
      updates.coins = profile.coins + coinsAmt
    } else if (pType === 'shards') {
      updates.character_slots = profile.character_slots + shardsAmt
    } else if (pType === 'subscription') {
      const baseSlots = TIER_BASE_SLOTS[subTier ?? ''] ?? 1
      updates.coins              = profile.coins + coinsAmt
      updates.subscription_tier  = subTier ?? ''
      updates.stripe_customer_id = session.customer ?? null
      if (baseSlots > profile.character_slots) updates.character_slots = baseSlots
    }

    if (Object.keys(updates).length === 0) return new Response('No-op', { status: 200 })

    const { error: updateErr } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (updateErr) return new Response('Update failed', { status: 500 })

    console.log(`checkout fulfilled ${pType} for ${userId}:`, updates)
    return new Response('OK', { status: 200 })
  }

  // ── invoice.paid — monthly subscription renewal ────────────────────────────
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object

    // Only process renewals, not the initial subscription creation (already handled above)
    if (invoice.billing_reason === 'subscription_create') {
      return new Response('Skipped initial invoice', { status: 200 })
    }

    const customerId = invoice.customer
    if (!customerId) return new Response('No customer', { status: 200 })

    // Look up user by stripe_customer_id
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, coins, character_slots, subscription_tier')
      .eq('stripe_customer_id', customerId)
      .single()

    if (fetchErr || !profile) {
      console.warn('No profile found for customer:', customerId)
      return new Response('Profile not found', { status: 200 })
    }

    const tier = profile.subscription_tier
    const coinsToAdd = TIER_COINS[tier] ?? 0
    const slotsToAdd = TIER_MONTHLY_SLOTS[tier] ?? 0

    if (coinsToAdd === 0 && slotsToAdd === 0) return new Response('No grants for tier', { status: 200 })

    const updates: Record<string, number> = {}
    if (coinsToAdd > 0) updates.coins = profile.coins + coinsToAdd
    if (slotsToAdd > 0) updates.character_slots = profile.character_slots + slotsToAdd

    const { error: updateErr } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (updateErr) {
      console.error('Renewal update failed:', updateErr)
      return new Response('Update failed', { status: 500 })
    }

    console.log(`renewal granted for ${profile.id} (${tier}): +${coinsToAdd} coins, +${slotsToAdd} slots`)
    return new Response('OK', { status: 200 })
  }

  return new Response('Ignored', { status: 200 })
})
