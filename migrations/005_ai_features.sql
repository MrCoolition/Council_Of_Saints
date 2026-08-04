create table if not exists ai_office_devotional (
  id uuid primary key default gen_random_uuid(),
  local_date date not null,
  country text not null default 'US',
  diocese_key text not null default '',
  liturgical_fingerprint text not null,
  prompt_version text not null,
  model text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (
    local_date,
    country,
    diocese_key,
    liturgical_fingerprint,
    prompt_version,
    model
  )
);

create index if not exists idx_ai_office_devotional_lookup
  on ai_office_devotional (
    local_date,
    country,
    diocese_key,
    prompt_version,
    model
  );

create table if not exists father_koverman_thread (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  context_kind text not null check (
    context_kind in (
      'general',
      'office',
      'mass',
      'scripture',
      'rosary',
      'prayer',
      'formation'
    )
  ),
  context_key text not null,
  context_title text not null,
  context_snapshot jsonb not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_father_koverman_thread_user_context
  on father_koverman_thread (user_id, context_key, updated_at desc);

create index if not exists idx_father_koverman_thread_user_updated
  on father_koverman_thread (user_id, updated_at desc);

create table if not exists ai_usage_event (
  id bigserial primary key,
  user_id uuid not null references app_user(id) on delete cascade,
  feature text not null check (feature in ('father_koverman_chat')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_event_user_feature_time
  on ai_usage_event (user_id, feature, created_at desc);

alter table father_koverman_thread enable row level security;
alter table ai_usage_event enable row level security;

drop policy if exists father_koverman_thread_user_isolation
  on father_koverman_thread;
create policy father_koverman_thread_user_isolation
on father_koverman_thread
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));

drop policy if exists ai_usage_event_user_isolation on ai_usage_event;
create policy ai_usage_event_user_isolation
on ai_usage_event
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));
