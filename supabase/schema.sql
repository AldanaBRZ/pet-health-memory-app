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
set search_path = ''
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

-- Private profile photos and vet documents. File contents stay outside the JSON
-- household record, and every object path starts with the signed-in user's ID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-health-files',
  'pet-health-files',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own pet files" on storage.objects;
create policy "Users can read their own pet files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-health-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their own pet files" on storage.objects;
create policy "Users can upload their own pet files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-health-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update their own pet files" on storage.objects;
create policy "Users can update their own pet files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pet-health-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'pet-health-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their own pet files" on storage.objects;
create policy "Users can delete their own pet files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-health-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
