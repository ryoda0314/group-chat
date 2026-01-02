import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL/Key missing. Check configuration.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Set custom JWT token for authenticated requests (for RLS policies)
export function setAuthToken(token: string | null) {
    if (token) {
        // Create a new client with the custom token in global headers
        // This is a workaround since we're using custom JWTs not Supabase Auth
        (supabase as any).rest.headers['Authorization'] = `Bearer ${token}`
        supabase.realtime.setAuth(token)
    }
}

// API Helper to call Edge Functions with proper headers or token
// Using direct fetch instead of supabase.functions.invoke to fix JSON serialization issue
export async function invokeFunction(name: string, body: any, token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const url = `${supabaseUrl}/functions/v1/${name}`
    console.log(`Invoking Edge Function: ${url}`)
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body), // Explicitly stringify the body
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        console.error('Edge Function Error Details:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
}

