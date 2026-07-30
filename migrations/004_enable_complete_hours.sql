update prayer_rule
set enabled_items = (
  select array_agg(item::prayer_item_type order by first_position)
  from (
    select item, min(position) as first_position
    from unnest(
      array[
        'office_readings',
        'morning_prayer',
        'daytime_prayer',
        'evening_prayer',
        'night_prayer'
      ]::text[] || enabled_items::text[]
    ) with ordinality as configured(item, position)
    group by item
  ) as ordered_items
)
where not (
  'office_readings'::prayer_item_type = any(enabled_items)
  and 'daytime_prayer'::prayer_item_type = any(enabled_items)
);
