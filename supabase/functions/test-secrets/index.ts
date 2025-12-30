import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    const env = Deno.env.toObject()
    // Filter out potentially sensitive keys if needed, but for local debugging we want to see everything relevant
    const keys = Object.keys(env).sort()

    const debugInfo = {
        allKeys: keys,
        SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET ? 'PRESENT (len=' + env.SUPABASE_JWT_SECRET.length + ')' : 'MISSING',
        JWT_SECRET: env.JWT_SECRET ? 'PRESENT (len=' + env.JWT_SECRET.length + ')' : 'MISSING',
        hasSecret: !!(env.SUPABASE_JWT_SECRET || env.JWT_SECRET)
    }

    return new Response(
        JSON.stringify(debugInfo, null, 2),
        { headers: { "Content-Type": "application/json" } },
    )
})
