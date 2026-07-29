create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  email text,
  address jsonb,
  total numeric(12,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx 
on public.orders(user_id);

create index if not exists orders_status_idx 
on public.orders(status);

create index if not exists order_items_order_id_idx 
on public.order_items(order_id);


-- ADMIN CHECK

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  );
$$;


-- CREAR PROFILE AUTOMATICAMENTE AL REGISTRAR USUARIO

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- UPDATED AT

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- TRIGGERS

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


drop trigger if exists set_orders_updated_at on public.orders;

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();


-- RLS

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;


-- POLICIES PROFILES

drop policy if exists "Profiles are viewable by owner or admin"
on public.profiles;

create policy "Profiles are viewable by owner or admin"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
);


drop policy if exists "Profiles can be created by owner"
on public.profiles;

create policy "Profiles can be created by owner"
on public.profiles
for insert
with check (
  auth.uid() = id
);


drop policy if exists "Profiles can be updated by owner"
on public.profiles;

create policy "Profiles can be updated by owner"
on public.profiles
for update
using (
  auth.uid() = id
);


-- POLICIES ORDERS

drop policy if exists "Users can view their own orders"
on public.orders;

create policy "Users can view their own orders"
on public.orders
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);


drop policy if exists "Users can insert their own orders"
on public.orders;

create policy "Users can insert their own orders"
on public.orders
for insert
with check (
  auth.uid() = user_id
  or user_id is null
  or public.is_admin()
);


drop policy if exists "Users can update their own orders"
on public.orders;

create policy "Users can update their own orders"
on public.orders
for update
using (
  auth.uid() = user_id
  or public.is_admin()
);


-- POLICIES ORDER ITEMS

drop policy if exists "Users can view their own order items"
on public.order_items;

create policy "Users can view their own order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
    and (
      auth.uid() = o.user_id
      or public.is_admin()
    )
  )
);


drop policy if exists "Users can insert order items for their own orders"
on public.order_items;

create policy "Users can insert order items for their own orders"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
    and (
      auth.uid() = o.user_id
      or public.is_admin()
    )
  )
);