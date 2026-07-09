create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null check (status in ('Backlog', 'In Progress', 'Review', 'Done')),
  assignee text not null default 'Unassigned',
  priority text not null default 'med' check (priority in ('low', 'med', 'high')),
  labels text[] not null default '{}',
  due_date date,
  estimate_hours integer not null default 0 check (estimate_hours >= 0),
  completed_date date,
  position integer not null default 0,
  has_warning boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.tasks(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null check (
    action in (
      'created',
      'moved',
      'completed',
      'reordered',
      'assigned',
      'unassigned',
      'deleted',
      'imported',
      'reset'
    )
  ),
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_status_position_idx on public.tasks(status, position);
create index if not exists comments_task_created_idx on public.comments(task_id, created_at desc);
create index if not exists activity_log_created_idx on public.activity_log(created_at desc);

alter table public.users disable row level security;
alter table public.tasks disable row level security;
alter table public.comments disable row level security;
alter table public.activity_log disable row level security;

insert into public.users (name, email, password_hash, role, avatar)
values
  ('Asha Admin', 'admin@udbhav.local', '$2b$12$pIAFbZqSfaJTMfufbu1BZ.6U9FL0SAeJjMaOEY0QVDDZVEKNkxrF.', 'admin', 'AA'),
  ('Mira Manager', 'manager@udbhav.local', '$2b$12$tpZXAa418tosP2lFBGEP4uAHe5dc7ecvoD8IH9Vcm9gUYXFHcqmZO', 'manager', 'MM'),
  ('Dev Member', 'member@udbhav.local', '$2b$12$hHojaDItQw8qXGxb1SkB2.UAND/cRTpFbRiEh4PgR1YjJn9daSGTC', 'member', 'DM')
on conflict (email) do nothing;
