-- (Applied 2026-07-01 as courses_slug_and_coords)
-- SEO/data prep for the courses table: slug for stable /courses/<slug>.html
-- URLs (disambiguated when different rows slugify identically, e.g. Bangor GC
-- in Gwynedd vs County Down, "Mid Sussex" vs "Mid-Sussex"), lat/lon for future
-- maps, par nullable for future community additions.

alter table public.courses alter column par drop not null;
alter table public.courses add column if not exists latitude  double precision;
alter table public.courses add column if not exists longitude double precision;
alter table public.courses add column if not exists slug text;

with s as (
  select id,
    trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) as base,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
      order by created_at, id
    ) as rn,
    trim(both '-' from regexp_replace(lower(coalesce(county, location, 'club')), '[^a-z0-9]+', '-', 'g')) as csl
  from public.courses
),
resolved as (
  select id,
    case when rn = 1 then base
         else base || '-' || coalesce(nullif(csl,''), 'club') ||
              case when rn > 2 then '-' || rn::text else '' end
    end as slug,
    row_number() over (
      partition by case when rn = 1 then base
                        else base || '-' || coalesce(nullif(csl,''), 'club') ||
                             case when rn > 2 then '-' || rn::text else '' end
                   end
      order by rn
    ) as final_rn
  from s
)
update public.courses c
   set slug = r.slug || case when r.final_rn > 1 then '-' || r.final_rn::text else '' end
  from resolved r
 where c.id = r.id and c.slug is null;

create unique index if not exists courses_slug_key on public.courses(slug);
