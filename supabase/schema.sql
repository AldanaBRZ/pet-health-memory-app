-- Pet Health Memory App MVP sync schema.
-- Run this in the Supabase SQL editor after creating a project.

create table if not exists public.pet_memories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  title text not null default 'Pet household',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pet_memories enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.pet_memories to authenticated;

alter table public.pet_memories
drop constraint if exists pet_memories_data_size_check;

alter table public.pet_memories
add constraint pet_memories_data_size_check
check (pg_column_size(data) < 1048576);

drop policy if exists "Users can read their own pet memory" on public.pet_memories;
create policy "Users can read their own pet memory"
on public.pet_memories
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pet memory" on public.pet_memories;
create policy "Users can insert their own pet memory"
on public.pet_memories
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pet memory" on public.pet_memories;
create policy "Users can update their own pet memory"
on public.pet_memories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pet memory" on public.pet_memories;
create policy "Users can delete their own pet memory"
on public.pet_memories
for delete
using (auth.uid() = user_id);

create or replace function public.set_pet_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pet_memory_updated_at on public.pet_memories;
create trigger set_pet_memory_updated_at
before update on public.pet_memories
for each row
execute function public.set_pet_memory_updated_at();
