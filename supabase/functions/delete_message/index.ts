import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        )

        const { room_id, message_id, device_id } = await req.json()
        if (!room_id || !message_id || !device_id) {
            throw new Error('Missing parameter')
        }

        // Verify ownership and delete
        // We are using Service Role Key, so we bypass RLS. 
        // We MUST manually verify that the device_id matches the sender_device_id.

        const { data: message, error: fetchError } = await supabaseClient
            .from('room_messages')
            .select('sender_device_id')
            .eq('id', message_id)
            .eq('room_id', room_id)
            .single()

        if (fetchError || !message) {
            throw new Error('Message not found')
        }

        if (message.sender_device_id !== device_id) {
            throw new Error('Not authorized to delete this message')
        }

        // Perform deletion
        const { error: deleteError } = await supabaseClient
            .from('room_messages')
            .delete()
            .eq('id', message_id)

        if (deleteError) throw deleteError

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : Object.prototype.toString.call(error) }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
