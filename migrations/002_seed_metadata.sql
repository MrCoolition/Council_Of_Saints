insert into breviary_edition (
  id,
  title,
  publisher,
  territory,
  edition_year,
  has_full_text_license,
  notes
) values (
  'us-four-volume',
  'Liturgy of the Hours, Four Volume Edition',
  'Catholic Book Publishing',
  'US',
  1975,
  false,
  'Metadata and page-reference workflow only.'
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
  'us-four-volume-iii',
  'us-four-volume',
  3,
  'Volume III',
  'Ordinary Time, Weeks 1-17'
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  volume_number = excluded.volume_number,
  title = excluded.title,
  season_coverage = excluded.season_coverage;

insert into liturgical_day (
  local_date,
  country,
  diocese,
  title,
  season,
  week_of_season,
  psalter_week,
  rank,
  color,
  calendar_notes
) values (
  date '2026-07-08',
  'US',
  null,
  'Wednesday of the Fourteenth Week in Ordinary Time',
  'Ordinary Time',
  14,
  2,
  'Weekday',
  'Green',
  'Seed metadata for the first dashboard build.'
)
on conflict (local_date, country, diocese) do update set
  title = excluded.title,
  season = excluded.season,
  week_of_season = excluded.week_of_season,
  psalter_week = excluded.psalter_week,
  rank = excluded.rank,
  color = excluded.color,
  calendar_notes = excluded.calendar_notes;

with day as (
  select id
  from liturgical_day
  where local_date = date '2026-07-08'
    and country = 'US'
    and diocese is null
),
guide as (
  insert into office_guide (
    liturgical_day_id,
    edition_id,
    hour_type,
    volume_id,
    general_note
  )
  select
    day.id,
    'us-four-volume',
    'morning_prayer'::prayer_item_type,
    'us-four-volume-iii',
    'Use the physical breviary for the official prayer text.'
  from day
  on conflict (liturgical_day_id, edition_id, hour_type) do update set
    volume_id = excluded.volume_id,
    general_note = excluded.general_note
  returning id
)
insert into office_guide_step (
  office_guide_id,
  step_order,
  section_type,
  page_start,
  instruction,
  copyright_safe_note
)
select guide.id, step_order, section_type, page_start, instruction, copyright_safe_note
from guide
cross join (
  values
    (1, 'ordinary', null::int, 'Begin with the Ordinary for Morning Prayer.', 'Metadata only.'),
    (2, 'psalter', null::int, 'Go to Psalter Week II, Wednesday.', 'Page references can be added after edition verification.'),
    (3, 'proper', null::int, 'Check the Proper of Saints before the concluding prayer.', 'Do not store official translated texts.')
) as steps(step_order, section_type, page_start, instruction, copyright_safe_note)
on conflict (office_guide_id, step_order) do update set
  section_type = excluded.section_type,
  page_start = excluded.page_start,
  instruction = excluded.instruction,
  copyright_safe_note = excluded.copyright_safe_note;

with day as (
  select id
  from liturgical_day
  where local_date = date '2026-07-08'
    and country = 'US'
    and diocese is null
),
guide as (
  insert into office_guide (
    liturgical_day_id,
    edition_id,
    hour_type,
    volume_id,
    general_note
  )
  select
    day.id,
    'us-four-volume',
    'night_prayer'::prayer_item_type,
    'us-four-volume-iii',
    'Night Prayer follows the weekly psalter and the physical book.'
  from day
  on conflict (liturgical_day_id, edition_id, hour_type) do update set
    volume_id = excluded.volume_id,
    general_note = excluded.general_note
  returning id
)
insert into office_guide_step (
  office_guide_id,
  step_order,
  section_type,
  page_start,
  instruction,
  copyright_safe_note
)
select guide.id, step_order, section_type, page_start, instruction, copyright_safe_note
from guide
cross join (
  values
    (1, 'ordinary', null::int, 'Begin with the examination of conscience.', 'Metadata only.'),
    (2, 'psalter', null::int, 'Use Wednesday Night Prayer from the psalter.', 'Do not store official translated texts.'),
    (3, 'closing', null::int, 'Use the concluding prayer indicated in the book.', 'Physical breviary carries the text.')
) as steps(step_order, section_type, page_start, instruction, copyright_safe_note)
on conflict (office_guide_id, step_order) do update set
  section_type = excluded.section_type,
  page_start = excluded.page_start,
  instruction = excluded.instruction,
  copyright_safe_note = excluded.copyright_safe_note;

insert into saint_profile (
  id,
  name,
  feast_month,
  feast_day,
  charism_tags,
  tone,
  formation_domains
) values
(
  'st_benedict',
  'St. Benedict',
  7,
  11,
  array['discipline', 'stability', 'obedience', 'rule_of_life'],
  'firm, monastic, practical',
  array['prayer_rule', 'daily_discipline', 'obedience']
),
(
  'st_ignatius_loyola',
  'St. Ignatius of Loyola',
  7,
  31,
  array['discernment', 'examen', 'ordered_desire'],
  'precise, discerning, strategic',
  array['vocation_discernment', 'examen', 'decision_making']
),
(
  'st_john_vianney',
  'St. John Vianney',
  8,
  4,
  array['priesthood', 'confession', 'eucharistic_love', 'souls'],
  'fatherly, piercing, parish-focused',
  array['priesthood', 'confession_prep', 'pastoral_charity']
),
(
  'st_thomas_aquinas',
  'St. Thomas Aquinas',
  1,
  28,
  array['study', 'truth', 'doctrine', 'humility'],
  'clear, ordered, rational',
  array['study', 'theology', 'philosophy']
),
(
  'st_francis_de_sales',
  'St. Francis de Sales',
  1,
  24,
  array['gentleness', 'perseverance', 'discouragement'],
  'gentle, steady, fatherly',
  array['discouragement', 'daily_fidelity']
),
(
  'st_joseph',
  'St. Joseph',
  3,
  19,
  array['chastity', 'work', 'silence', 'protection'],
  'quiet, strong, paternal',
  array['chastity', 'work', 'hidden_life']
),
(
  'blessed_virgin_mary',
  'Blessed Virgin Mary',
  null,
  null,
  array['surrender', 'humility', 'fiat', 'prayer'],
  'maternal, pure, contemplative',
  array['surrender', 'prayer', 'obedience']
)
on conflict (id) do update set
  name = excluded.name,
  feast_month = excluded.feast_month,
  feast_day = excluded.feast_day,
  charism_tags = excluded.charism_tags,
  tone = excluded.tone,
  formation_domains = excluded.formation_domains,
  active = true;

insert into council_template (
  saint_profile_id,
  session_type,
  condition_tags,
  message,
  action_item,
  virtue_focus,
  sacrifice
) values
(
  'st_benedict',
  'morning',
  array['missed_prayer', 'daily_discipline'],
  'Begin again with stability. Do not negotiate with the hour; give God the first faithful act that is in front of you.',
  'Mark Morning Prayer and Night Prayer today, even if one must be brief.',
  'Stability',
  'Leave one needless comfort untouched.'
),
(
  'st_ignatius_loyola',
  'night',
  array['discernment', 'examen'],
  'Name the movement of the day plainly. Consolation and desolation are not verdicts; they are material for discernment.',
  'Record an encrypted examen entry with one grace and one attachment.',
  'Discernment',
  'Pause before the next impulse to explain yourself.'
),
(
  'st_thomas_aquinas',
  'study',
  array['needs_study', 'truth'],
  'Order your mind toward truth with humility. A small, faithful study period is better than a grand plan left untouched.',
  'Complete one focused study block before entertainment.',
  'Studiousness',
  'Close one distracting tab.'
),
(
  'st_john_vianney',
  'confession_prep',
  array['preparing_confession', 'souls'],
  'Let contrition be honest and simple. Bring sin into the light without dramatizing it or hiding from mercy.',
  'Prepare a concise list for confession outside this app.',
  'Contrition',
  'Make one act of reparation quietly.'
)
on conflict (saint_profile_id, session_type, message) do update set
  condition_tags = excluded.condition_tags,
  action_item = excluded.action_item,
  virtue_focus = excluded.virtue_focus,
  sacrifice = excluded.sacrifice,
  active = true;
