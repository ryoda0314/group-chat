import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
    if (room.owner_device_id !== device_id) throw new Error('Not authorized (Owner only)')

    // Update locked_at
    const { error: updateError } = await supabaseClient
      .from('rooms')
      .update({ locked_at: new Date().toISOString() })
      .eq('id', room_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
