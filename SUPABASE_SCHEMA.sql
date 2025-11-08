-- Supabase SQL starter for monEZ
-- Run this in Supabase SQL editor to create base tables if not done

create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  amount numeric(12,2) not null,
  category text,
  group_id uuid,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  split_with uuid[], -- array of user ids
  is_settled boolean default false
);

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  members uuid[],
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists friends (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  friend_id uuid references users(id),
  created_at timestamptz default now()
);
