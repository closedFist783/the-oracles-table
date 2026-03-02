import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !user) return new Response('Unauthorized', { status: 401 })

  // Use service role to delete the user
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Delete all user data first
  await supabaseAdmin.from('campaign_messages').delete().eq('user_id', user.id)
  await supabaseAdmin.from('campaign_npcs').delete().eq('user_id', user.id)
  await supabaseAdmin.from('inventory').delete().eq('user_id', user.id)
  await supabaseAdmin.from('quests').delete().eq('user_id', user.id)
  await supabaseAdmin.from('campaigns').delete().eq('user_id', user.id)
  await supabaseAdmin.from('characters').delete().eq('user_id', user.id)
  await supabaseAdmin.from('profiles').delete().eq('id', user.id)

  // Delete the auth user
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    console.error('Failed to delete auth user:', deleteErr)
    return new Response(JSON.stringify({ error: deleteErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
