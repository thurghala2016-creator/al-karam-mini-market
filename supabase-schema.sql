-- AL-KARAM SHOP database setup
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- The app requires users to sign in. Create the two user accounts yourself
-- in Supabase Dashboard > Authentication > Users (do not enable public sign-up).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Remove broad defaults, then allow signed-in shop accounts only.
revoke all on table public.products from anon, authenticated;
grant select, insert, update, delete on table public.products to authenticated;

drop policy if exists "Shop users can read products" on public.products;
drop policy if exists "Shop users can add products" on public.products;
drop policy if exists "Shop users can update products" on public.products;
drop policy if exists "Shop users can delete products" on public.products;

create policy "Shop users can read products"
on public.products for select to authenticated using (true);

create policy "Shop users can add products"
on public.products for insert to authenticated with check (true);

create policy "Shop users can update products"
on public.products for update to authenticated using (true) with check (true);

create policy "Shop users can delete products"
on public.products for delete to authenticated using (true);

-- Add the table to Supabase Realtime so both phones see updates.
do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication not found; enable Realtime for products in Database > Publications.';
end $$;

-- Start empty: no sample products are inserted.
