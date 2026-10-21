-- Rannaghor BD schema — run in Supabase Dashboard > SQL Editor.
-- Recipe text and photos still need separate license/permission verification.

create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title_bn text not null check (char_length(title_bn) between 1 and 180),
  title_en text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,150}$'),
  description_bn text,
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  instructions jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes between 0 and 10080),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes between 0 and 10080),
  servings integer check (servings is null or servings between 1 and 1000),
  difficulty text default 'সহজ',
  cuisine text,
  category text,
  image_url text,
  source_url text,
  license_name text not null,
  license_url text,
  attribution text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_published_created_idx
  on public.recipes (status, created_at desc);
create index if not exists recipes_cuisine_idx on public.recipes (cuisine);
create index if not exists recipes_category_idx on public.recipes (category);
create index if not exists recipes_title_bn_idx on public.recipes (title_bn);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

-- Public visitors can only see recipes marked published.
drop policy if exists "Public can read published recipes" on public.recipes;
create policy "Public can read published recipes"
  on public.recipes for select
  using (status = 'published');

-- Admins are identified through a server-managed Supabase app_metadata claim.
-- Never let regular users set their own app_metadata.role through client-side APIs.
drop policy if exists "Admins can manage all recipes" on public.recipes;
create policy "Admins can manage all recipes"
  on public.recipes for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.recipes to anon, authenticated;
grant insert, update, delete on public.recipes to authenticated;
