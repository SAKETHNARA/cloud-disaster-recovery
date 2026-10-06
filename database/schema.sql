-- =====================================================
-- Cloud-Based Disaster Recovery Management System
-- Database schema (PostgreSQL / Supabase)
-- =====================================================

-- 1. PROFILES (extra user info; passwords live in Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- 2. BACKUPS (one row per backup operation)
create table if not exists public.backups (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  backup_name       text not null,
  status            text not null default 'in_progress'
                    check (status in ('in_progress', 'success', 'failed')),
  total_files       integer not null default 0,
  total_size_bytes  bigint  not null default 0,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

-- 3. BACKUP_FILES (one row per file stored in the cloud)
create table if not exists public.backup_files (
  id               uuid primary key default gen_random_uuid(),
  backup_id        uuid not null references public.backups(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  file_name        text not null,
  storage_path     text not null,
  file_size_bytes  bigint not null default 0,
  file_type        text,
  created_at       timestamptz not null default now()
);

-- 4. DISASTER_EVENTS (simulated data-loss events)
create table if not exists public.disaster_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  disaster_type   text not null default 'accidental_deletion',
  files_affected  integer not null default 0,
  occurred_at     timestamptz not null default now(),
  status          text not null default 'active'
                  check (status in ('active', 'recovered'))
);

-- 5. RECOVERY_LOGS (one row per recovery, with RPO and RTO)
create table if not exists public.recovery_logs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  disaster_id             uuid references public.disaster_events(id) on delete set null,
  backup_id               uuid references public.backups(id) on delete set null,
  files_recovered         integer not null default 0,
  files_failed            integer not null default 0,
  backup_time             timestamptz,
  disaster_time           timestamptz,
  recovery_started_at     timestamptz,
  recovery_completed_at   timestamptz,
  rpo_seconds             integer,
  rto_seconds             numeric(10, 2),
  status                  text not null default 'success'
                          check (status in ('success', 'partial', 'failed'))
);

-- Indexes to make history pages fast
create index if not exists idx_backups_user      on public.backups(user_id, created_at desc);
create index if not exists idx_files_backup      on public.backup_files(backup_id);
create index if not exists idx_disasters_user    on public.disaster_events(user_id, occurred_at desc);
create index if not exists idx_recovery_user     on public.recovery_logs(user_id, recovery_started_at desc);

-- =====================================================
-- AUTO-CREATE A PROFILE WHEN A USER REGISTERS
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- SECURITY: ROW LEVEL SECURITY (users see only their own rows)
-- =====================================================
alter table public.profiles        enable row level security;
alter table public.backups         enable row level security;
alter table public.backup_files    enable row level security;
alter table public.disaster_events enable row level security;
alter table public.recovery_logs   enable row level security;

create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users read own backups"
  on public.backups for select using (auth.uid() = user_id);
create policy "Users read own backup files"
  on public.backup_files for select using (auth.uid() = user_id);
create policy "Users read own disaster events"
  on public.disaster_events for select using (auth.uid() = user_id);
create policy "Users read own recovery logs"
  on public.recovery_logs for select using (auth.uid() = user_id);