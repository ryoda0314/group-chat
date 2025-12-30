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

    const { device_id, display_name, rid, key } = await req.json()
    if (!device_id || !display_name || !rid || !key) {
      throw new Error('Missing parameter')
    }

    // Hash the provided key
    const msgUint8 = new TextEncoder().encode(key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const join_key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Validate Room
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', rid)
      .eq('join_key_hash', join_key_hash)
      .single()

    if (roomError || !room) {
      throw new Error('Invalid Room or Key')
    }

    const now = new Date()
    if (new Date(room.expires_at) < now) throw new Error('Room expired')
    if (room.locked_at) throw new Error('Room locked')

    // Upsert Participant
    const { error: partError } = await supabaseClient
      .from('room_participants')
      .upsert({
        room_id: room.id,
        device_id: device_id,
        display_name: display_name,
        last_seen_at: now.toISOString(),
        joined_at: now.toISOString() // This might overwrite original joined_at? logic: on conflict do update.
        // If we want to keep original join time, we need slightly different query.
        // For upsert, on conflict (room_id, device_id) do update set display_name=..., last_seen_at=...
      }, { onConflict: 'room_id, device_id' })

    if (partError) throw partError

    // Check ban status (upsert might succeed but we should check 'is_banned')
    const { data: part } = await supabaseClient
      .from('room_participants')
      .select('is_banned')
      .eq('room_id', room.id)
      .eq('device_id', device_id)
      .single();

    if (part?.is_banned) throw new Error('You are banned from this room')

    // Generate JWT
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) throw new Error('Missing JWT Secret')

    const { create, getNumericDate } = await import("https://deno.land/x/djwt@v2.9.1/mod.ts")
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: device_id,
        role: "authenticated",
        aud: "authenticated",
        exp: getNumericDate(60 * 60 * 24 * 30) // 30 days
      },
      key
    )

    return new Response(
      JSON.stringify({
        room,
        token
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
