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

    const { device_id, display_name, room_name } = await req.json()
    if (!device_id || !display_name) {
      throw new Error('Missing device_id or display_name')
    }

    // Generate Join Key and Hash
    const join_key = crypto.randomUUID().split('-')[0] // Short key
    const msgUint8 = new TextEncoder().encode(join_key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const join_key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create Room
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .insert({
        owner_device_id: device_id,
        name: room_name || null,
        join_key_hash: join_key_hash
      })
      .select()
      .single()

    if (roomError) throw roomError

    // Add Owner as Participant
    const { error: partError } = await supabaseClient
      .from('room_participants')
      .insert({
        room_id: room.id,
        device_id: device_id,
        display_name: display_name,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })

    if (partError) throw partError

    // Generate JWT
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) {
      const availableKeys = Object.keys(Deno.env.toObject()).filter(k => !k.includes('KEY') && !k.includes('SECRET')).join(', ')
      throw new Error(`Server configuration error: Missing JWT Secret. Available public keys: ${availableKeys}. Has JWT_SECRET: ${!!Deno.env.get('JWT_SECRET')}, Has SUPABASE_JWT_SECRET: ${!!Deno.env.get('SUPABASE_JWT_SECRET')}`)
    }

    const { create, getNumericDate } = await import("https://deno.land/x/djwt@v2.9.1/mod.ts")

    // Create the key
    // We need to convert the hex/string secret to a CryptoKey? 
    // djwt create() can take a CryptoKey.
    // Simpler: use the secret string if supported, or import verify signature logic.
    // Actually, for Supabase we need to share the secret. 
    // Let's use a simpler approach compatible with Supabase Auth if possible, but we are issuing custom tokens.

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
        role: "authenticated", // Important for RLS
        aud: "authenticated",  // Important for Supabase
        exp: getNumericDate(60 * 60 * 24 * 30) // 30 days
      },
      key
    )

    return new Response(
      JSON.stringify({
        room,
        join_key,
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
