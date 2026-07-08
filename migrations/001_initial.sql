create extension if not exists pgcrypto;

do $$
begin
  create type formation_stage as enum (
    'lay_discernment',
    'applicant',
    'seminarian',
    'deacon_candidate',
    'priest',
    'religious',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type prayer_item_type as enum (
    'office_readings',
    'morning_prayer',
    'daytime_prayer',
    'evening_prayer',
    'night_prayer',
    'mass',
    'rosary',
    'mental_prayer',
    'spiritual_reading',
    'study',
    'service',
    'sacrifice'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type habit_status as enum (
    'done',
    'partial',
    'missed',
    'impeded',
    'deferred'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type council_session_type as enum (
    'morning',
    'midday',
    'night',
    'confession_prep',
    'study',
    'vocation_discernment'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  auth_subject text unique not null,
  display_name text not null,
  timezone text not null default 'America/New_York',
  country text not null default 'US',
  diocese text,
  formation_stage formation_stage not null default 'lay_discernment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists breviary_edition (
  id text primary key,
  title text not null,
  publisher text,
  territory text not null default 'US',
  edition_year int,
  has_full_text_license boolean not null default false,
  notes text
);

create table if not exists breviary_volume (
  id text primary key,
  edition_id text not null references breviary_edition(id) on delete cascade,
  volume_number int not null,
  title text not null,
  season_coverage text not null,
  unique (edition_id, volume_number)
);

create table if not exists liturgical_day (
  id uuid primary key default gen_random_uuid(),
  local_date date not null,
  country text not null default 'US',
  diocese text,
  title text not null,
  season text not null,
  week_of_season int,
  psalter_week int,
  rank text not null,
  color text,
  has_evening_prayer_i boolean not null default false,
  calendar_notes text,
  unique (local_date, country, diocese)
);

create table if not exists office_guide (
  id uuid primary key default gen_random_uuid(),
  liturgical_day_id uuid not null references liturgical_day(id) on delete cascade,
  edition_id text not null references breviary_edition(id),
  hour_type prayer_item_type not null,
  volume_id text references breviary_volume(id),
  general_note text,
  unique (liturgical_day_id, edition_id, hour_type)
);

create table if not exists office_guide_step (
  id uuid primary key default gen_random_uuid(),
  office_guide_id uuid not null references office_guide(id) on delete cascade,
  step_order int not null,
  section_type text not null,
  page_start int,
  page_end int,
  instruction text not null,
  requires_user_choice boolean not null default false,
  copyright_safe_note text,
  content_license_status text not null default 'metadata_only',
  unique (office_guide_id, step_order)
);

create table if not exists prayer_rule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  enabled_items prayer_item_type[] not null,
  start_date date not null default current_date,
  review_date date,
  difficulty_level int not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists habit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  local_date date not null,
  item_type prayer_item_type not null,
  status habit_status not null,
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, local_date, item_type)
);

create table if not exists encrypted_examen_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  local_date date not null,
  ciphertext text not null,
  encryption_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create table if not exists saint_profile (
  id text primary key,
  name text not null,
  feast_month int,
  feast_day int,
  charism_tags text[] not null default '{}',
  tone text not null,
  formation_domains text[] not null default '{}',
  source_notes text,
  active boolean not null default true
);

create table if not exists council_template (
  id uuid primary key default gen_random_uuid(),
  saint_profile_id text not null references saint_profile(id),
  session_type council_session_type not null,
  condition_tags text[] not null default '{}',
  message text not null,
  action_item text not null,
  virtue_focus text,
  sacrifice text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (saint_profile_id, session_type, message)
);

create table if not exists council_message (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  local_date date not null,
  saint_profile_id text references saint_profile(id),
  session_type council_session_type not null,
  message text not null,
  action_item text,
  virtue_focus text,
  sacrifice text,
  generated_by text not null default 'curated_template',
  created_at timestamptz not null default now(),
  unique (user_id, local_date, session_type)
);

create index if not exists idx_habit_log_user_date on habit_log(user_id, local_date);
create index if not exists idx_liturgical_day_date_region on liturgical_day(local_date, country, diocese);
create index if not exists idx_council_message_user_date on council_message(user_id, local_date);

alter table prayer_rule enable row level security;
alter table habit_log enable row level security;
alter table encrypted_examen_entry enable row level security;
alter table council_message enable row level security;

drop policy if exists prayer_rule_user_isolation on prayer_rule;
create policy prayer_rule_user_isolation
on prayer_rule
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));

drop policy if exists habit_log_user_isolation on habit_log;
create policy habit_log_user_isolation
on habit_log
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));

drop policy if exists encrypted_examen_user_isolation on encrypted_examen_entry;
create policy encrypted_examen_user_isolation
on encrypted_examen_entry
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));

drop policy if exists council_message_user_isolation on council_message;
create policy council_message_user_isolation
on council_message
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));
