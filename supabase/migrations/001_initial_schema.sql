-- ============================================================
-- TUKI initial schema
-- Applies cleanly to an empty Supabase project (SQL Editor).
-- ============================================================

-- ── PROFILES: extension of auth.users ───────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'master', 'admin')),
  full_name text,
  email text,
  phone text,                    -- display format +972...
  whatsapp_number text,          -- wa.me format: 9725XXXXXXXX
  locale text not null default 'he' check (locale in ('he', 'ru', 'en')),
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'locale', 'he')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── MASTERS: professional profiles ──────────────────────────
create table public.masters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  specializations text[] not null default '{}',   -- CategoryId[] from src/lib/tasks/categories.ts
  work_cities text[] not null default '{}',       -- city id[] from src/lib/geo/cities.ts
  experience_years int check (experience_years >= 0),
  bio text,
  portfolio_urls text[] not null default '{}',
  is_active boolean not null default true,        -- false = vacation mode
  rating numeric(3,2) not null default 0,         -- 0..5, recalculated by trigger
  reviews_count int not null default 0,
  completed_tasks int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_masters_specializations on public.masters using gin (specializations);
create index idx_masters_work_cities on public.masters using gin (work_cities);

-- ── TASKS: client requests ──────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'assigned', 'completed', 'cancelled', 'expired')),
  language text not null default 'he' check (language in ('he', 'ru', 'en')),
  subtasks jsonb not null default '[]',           -- [{category, title, details?}]
  categories text[] not null default '{}',        -- denormalized for matching
  area_sqm numeric,
  budget_min int check (budget_min >= 0),
  budget_max int check (budget_max >= 0),
  timeline text,
  city_id text not null,                          -- city id from src/lib/geo/cities.ts
  work_details text,
  raw_input text,
  photo_urls text[] not null default '{}',
  selected_bid_id uuid,                           -- fk added after bids exists
  published_at timestamptz,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_tasks_status_city on public.tasks (status, city_id) where status = 'published';
create index idx_tasks_categories on public.tasks using gin (categories);
create index idx_tasks_client on public.tasks (client_id);

-- ── BIDS: master offers ─────────────────────────────────────
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  price int check (price >= 0),
  timeline text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'selected', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (task_id, master_id)                     -- one bid per master per task
);

alter table public.tasks
  add constraint tasks_selected_bid_fk
  foreign key (selected_bid_id) references public.bids(id);

create index idx_bids_task on public.bids (task_id);
create index idx_bids_master on public.bids (master_id);

-- ── REVIEWS: detailed ratings (5 criteria per PRD §8.5) ─────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  score_quality int not null check (score_quality between 1 and 5),
  score_budget int not null check (score_budget between 1 and 5),
  score_punctuality int not null check (score_punctuality between 1 and 5),
  score_cleanliness int not null check (score_cleanliness between 1 and 5),
  score_communication int not null check (score_communication between 1 and 5),
  text text,
  master_response text,
  created_at timestamptz not null default now()
);

create index idx_reviews_master on public.reviews (master_id);

-- ── Rating recalculation trigger ────────────────────────────
-- Weighted per PRD §8.5: quality 35%, budget 25%, punctuality 15%,
-- cleanliness 15%, communication 10%
create or replace function public.recalc_master_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  master uuid;
begin
  master := coalesce(new.master_id, old.master_id);
  update public.masters m
  set
    rating = coalesce((
      select round(avg(
        r.score_quality * 0.35
        + r.score_budget * 0.25
        + r.score_punctuality * 0.15
        + r.score_cleanliness * 0.15
        + r.score_communication * 0.10
      )::numeric, 2)
      from public.reviews r where r.master_id = master
    ), 0),
    reviews_count = (
      select count(*) from public.reviews r where r.master_id = master
    )
  where m.id = master;
  return coalesce(new, old);
end;
$$;

create trigger reviews_recalc_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_master_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.masters enable row level security;
alter table public.tasks enable row level security;
alter table public.bids enable row level security;
alter table public.reviews enable row level security;

-- profiles: everyone can read (names shown in bids/profiles);
-- sensitive fields are not stored here beyond necessary contacts
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- masters: public read (clients browse masters), owner writes
create policy "masters_select" on public.masters
  for select using (true);

create policy "masters_write_own" on public.masters
  for insert with check (user_id = auth.uid());

create policy "masters_update_own" on public.masters
  for update using (user_id = auth.uid());

-- tasks: clients see own; masters see published (app-level matching
-- filters by city/specialization); admins see all via service role
create policy "tasks_select" on public.tasks
  for select using (
    client_id = auth.uid()
    or status = 'published'
    or exists (
      select 1 from public.bids b
      where b.task_id = id and b.master_id in (
        select m.id from public.masters m where m.user_id = auth.uid()
      )
    )
  );

create policy "tasks_insert_own" on public.tasks
  for insert with check (client_id = auth.uid());

create policy "tasks_update_own" on public.tasks
  for update using (client_id = auth.uid());

-- bids: task owner sees all bids on their task; master sees own bids
create policy "bids_select" on public.bids
  for select using (
    master_id in (select m.id from public.masters m where m.user_id = auth.uid())
    or task_id in (select t.id from public.tasks t where t.client_id = auth.uid())
  );

create policy "bids_insert_own" on public.bids
  for insert with check (
    master_id in (select m.id from public.masters m where m.user_id = auth.uid())
    and task_id in (select t.id from public.tasks t where t.status = 'published')
  );

create policy "bids_update_participants" on public.bids
  for update using (
    master_id in (select m.id from public.masters m where m.user_id = auth.uid())
    or task_id in (select t.id from public.tasks t where t.client_id = auth.uid())
  );

-- reviews: public read; only the task client writes the review,
-- master can update own response
create policy "reviews_select" on public.reviews
  for select using (true);

create policy "reviews_insert_client" on public.reviews
  for insert with check (
    client_id = auth.uid()
    and task_id in (
      select t.id from public.tasks t
      where t.client_id = auth.uid() and t.status in ('assigned', 'completed')
    )
  );

create policy "reviews_update_master_response" on public.reviews
  for update using (
    master_id in (select m.id from public.masters m where m.user_id = auth.uid())
    or client_id = auth.uid()
  );
