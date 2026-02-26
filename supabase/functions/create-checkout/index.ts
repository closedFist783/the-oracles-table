import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { priceId, mode, metadata, successUrl, cancelUrl, userId } = body

    if (!priceId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing priceId or userId' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe key not configured' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Build Stripe Checkout Session ──────────────────────────────
    const params = new URLSearchParams({
      mode:                        mode ?? 'payment',
      success_url:                 successUrl,
      cancel_url:                  cancelUrl,
      'line_items[0][price]':      priceId,
      'line_items[0][quantity]':   '1',
      client_reference_id:         userId,
      'metadata[user_id]':         userId,
    })

    for (const [k, v] of Object.entries(metadata ?? {})) {
      params.set(`metadata[${k}]`, String(v))
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      console.error('Stripe error:', JSON.stringify(session))
      throw new Error(session.error?.message ?? `Stripe error ${stripeRes.status}`)
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
