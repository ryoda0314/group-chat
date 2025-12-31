-- Create room_todos table
create table public.room_todos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  text text not null,
  completed boolean default false not null,
  created_at timestamptz default now() not null,
  created_by_device_id uuid null
);

-- Indexes
create index idx_todos_room on public.room_todos(room_id, created_at);

-- RLS
alter table public.room_todos enable row level security;

-- Policies
create policy "Participants can view todos"
  on public.room_todos for select
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_todos.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Participants can insert todos"
  on public.room_todos for insert
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_todos.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Participants can update todos"
  on public.room_todos for update
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_todos.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );

create policy "Participants can delete todos"
  on public.room_todos for delete
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = room_todos.room_id
      and rp.device_id = public.get_device_id()
      and rp.is_banned = false
    )
  );
