/**
 * Enable Realtime for room_messages
 */

-- Add room_messages to the realtime publication
alter publication supabase_realtime add table room_messages;
