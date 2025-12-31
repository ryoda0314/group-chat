-- Temporarily disable RLS for development
-- This allows the frontend to read data without authentication

ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_attachments DISABLE ROW LEVEL SECURITY;
