insert into breviary_edition (
  id,
  title,
  publisher,
  territory,
  edition_year,
  has_full_text_license,
  notes
) values (
  'us-four-volume-large-print',
  'Liturgy of the Hours, Large Print Four Volume Edition',
  'Catholic Book Publishing',
  'US',
  1975,
  false,
  'Large-print physical book companion. Stores references and user-verified pages, not official prayer text.'
)
on conflict (id) do update set
  title = excluded.title,
  publisher = excluded.publisher,
  territory = excluded.territory,
  edition_year = excluded.edition_year,
  has_full_text_license = excluded.has_full_text_license,
  notes = excluded.notes;

insert into breviary_volume (
  id,
  edition_id,
  volume_number,
  title,
  season_coverage
) values (
  'us-four-volume-large-print-iii',
  'us-four-volume-large-print',
  3,
  'Volume III',
  'Ordinary Time, Weeks 1-17'
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  volume_number = excluded.volume_number,
  title = excluded.title,
  season_coverage = excluded.season_coverage;

create table if not exists user_book_reference (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  edition_id text not null default 'us-four-volume-large-print'
    references breviary_edition(id),
  local_date date not null,
  hour_type prayer_item_type not null,
  section_type text not null,
  step_order int not null,
  page_start int not null,
  page_end int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date, hour_type, section_type, step_order),
  check (page_start between 1 and 5000),
  check (page_end is null or page_end between page_start and 5000)
);

create index if not exists idx_user_book_reference_user_date
on user_book_reference(user_id, local_date);

alter table user_book_reference enable row level security;

drop policy if exists user_book_reference_user_isolation on user_book_reference;
create policy user_book_reference_user_isolation
on user_book_reference
for all
using (user_id::text = current_setting('app.current_user_id', true))
with check (user_id::text = current_setting('app.current_user_id', true));
