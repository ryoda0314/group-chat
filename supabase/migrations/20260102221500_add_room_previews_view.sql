-- View to get room details with latest message
create or replace view public.room_previews as
select
  r.id as room_id,
  r.name as room_name,
  r.updated_at,
  (
    select json_build_object(
      'kind', m.kind,
      'body', m.body,
      'created_at', m.created_at,
      'sender_name', m.sender_name_snapshot
    )
    from public.room_messages m
    where m.room_id = r.id
    order by m.created_at desc
    limit 1
  ) as latest_message
from public.rooms r;

-- Grant access (relies on underlying table permissions, but since we use RLS, 
-- we need to ensure the view itself is accessible. 
-- In Supabase, usually views invoked with security invoker respect underlying RLS)
-- We should set security_invoker = true
alter view public.room_previews set (security_invoker = true);
