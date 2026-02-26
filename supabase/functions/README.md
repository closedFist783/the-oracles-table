# Stripe + Supabase Edge Functions Setup

## 1. Stripe — Create Products & Price IDs

Go to https://dashboard.stripe.com → Products → Create each product:

| Product               | Type       | Price    |
|-----------------------|------------|----------|
| Adventurer's Pouch    | One-time   | $1.99    |
| Hero's Chest          | One-time   | $4.99    |
| Champion's Reward     | One-time   | $9.99    |
| Dragon's Hoard        | One-time   | $19.99   |
| Character Shard ×1    | One-time   | $1.99    |
| Character Shard ×3    | One-time   | $4.99    |
| Character Shard ×6    | One-time   | $8.99    |
| Wanderer (sub)        | Recurring  | $4.99/mo |
| Adventurer (sub)      | Recurring  | $7.99/mo |
| Archmage (sub)        | Recurring  | $12.99/mo|

Copy the **Price ID** (starts with `price_...`) for each.

Paste them into `src/components/Upgrade.jsx` in the `PRICES` constant.

---

## 2. Stripe — Webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for: `checkout.session.completed`
4. Copy the **Signing Secret** (starts with `whsec_...`)

---

## 3. Supabase — Edge Function Secrets

Go to Supabase Dashboard → Edge Functions → Manage secrets and add:

| Key                        | Value                            |
|----------------------------|----------------------------------|
| `STRIPE_SECRET_KEY`        | `sk_live_...` (or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET`    | `whsec_...` from step 2 above    |
| `SUPABASE_SERVICE_ROLE_KEY`| From Supabase → Settings → API   |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically available in Edge Functions.

---

## 4. Deploy the Edge Functions

Install Supabase CLI if not already:
```bash
brew install supabase/tap/supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Deploy both functions:
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

---

## 5. Run the Schema Migration

In Supabase SQL Editor, run the updated `supabase-schema.sql` to add
the `subscription_tier` column to `profiles`.

---

## 6. Test with Stripe Test Mode

- Use `sk_test_...` key and test card `4242 4242 4242 4242`
- Check that coins/slots update in Supabase after checkout completes
- Then switch to `sk_live_...` when ready to go live
