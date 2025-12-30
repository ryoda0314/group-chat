-- Enable pgcrypto for UUIDs
create extension if not exists "pgcrypto";

-- 1. Rooms Table
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  owner_device_id uuid not null,
  join_key_hash text not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Participants Table
create table public.room_participants (
  room_id uuid references public.rooms(id) on delete cascade,
  device_id uuid, -- Using UUID for device_id
  display_name text not null,
  is_banned boolean default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, device_id)
);

-- 3. Messages Table
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  sender_device_id uuid null, -- Nullable if user deleted? No, keep it.
  sender_name_snapshot text not null,
  kind text not null check (kind in ('text', 'image')),
  body text, -- text content or null/caption
  attachment_id uuid, -- link to room_attachments if image
  created_at timestamptz not null default now()
);

-- 4. Attachments Table
create table public.room_attachments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  uploader_device_id uuid,
  kind text not null check (kind in ('image')),
  storage_path text not null,
  mime text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_rooms_expires_at on public.rooms(expires_at);
create index idx_messages_room_created on public.room_messages(room_id, created_at desc);
create index idx_participants_device on public.room_participants(device_id);

-- RLS Enablement
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_attachments enable row level security;

-- RLS Policies
-- Helper function to get current device_id from JWT
-- Uses public schema to avoid permissions error
create or replace function public.get_device_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;

-- ROOMS
create policy "Participants can view room"
  on public.rooms for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = rooms.id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Owner can update room"
  on public.rooms for update
  using (
    owner_device_id = public.get_device_id()
  );

-- PARTICIPANTS
create policy "Participants can view others"
  on public.room_participants for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_participants.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "User can update self"
  on public.room_participants for update
  using (
    device_id = public.get_device_id()
  );

-- MESSAGES
create policy "Participants can view messages"
  on public.room_messages for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_messages.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Participants can insert messages"
  on public.room_messages for insert
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_messages.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
    and exists (
      select 1 from public.rooms r
      where r.id = room_messages.room_id
      and (r.locked_at is null)
      and (r.expires_at > now())
    )
    and sender_device_id = public.get_device_id()
  );

-- ATTACHMENTS
create policy "Participants can view attachments"
  on public.room_attachments for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_attachments.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Participants can insert attachments"
  on public.room_attachments for insert
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_attachments.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
     and exists (
      select 1 from public.rooms r
      where r.id = room_attachments.room_id
      and (r.locked_at is null)
      and (r.expires_at > now())
    )
  );

-- Storage (Bucket and Policies)
insert into storage.buckets (id, name, public)
values ('room-uploads', 'room-uploads', true)
on conflict (id) do nothing;

create policy "Participants can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'room-uploads'
    and (public.get_device_id() is not null)
  );

create policy "Participants can view files"
  on storage.objects for select
  using (
    bucket_id = 'room-uploads'
  );

-- Ensure public access is on for MVP simplicity (URL access)
update storage.buckets set public = true where id = 'room-uploads';
