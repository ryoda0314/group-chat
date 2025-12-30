import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { device_id, room_id } = await req.json()

    // Verify Owner
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('owner_device_id')
      .eq('id', room_id)
      .single()

    if (findError || !room) throw new Error('Room not found')
    if (room.owner_device_id !== device_id) throw new Error('Not authorized')

    // Generate New Key
    const join_key = crypto.randomUUID().split('-')[0]
    const msgUint8 = new TextEncoder().encode(join_key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const join_key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Update Room
    const { error: updateError } = await supabaseClient
      .from('rooms')
      .update({ join_key_hash: join_key_hash })
      .eq('id', room_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ join_key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
