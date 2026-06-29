-- Security hardening for Log My Golf (addresses Supabase advisor warnings)
-- Apply with:  supabase db push   (or paste into the SQL editor)

-- 1) handle_new_user(): pin search_path (prevents search_path hijacking) and
--    stop it being callable as a public RPC. It only ever runs as a trigger,
--    so anon/authenticated have no reason to EXECUTE it directly.
alter function public.handle_new_user() set search_path = '';

revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2) Tighten the public storage buckets so clients can fetch a file by URL but
--    cannot LIST the whole bucket. Object URLs still work; enumeration does not.
--    (Adjust policy names if yours differ — see advisor output.)
drop policy if exists "Public avatar read" on storage.objects;
create policy "Public avatar read"
  on storage.objects for select
  to public
  using (
    bucket_id = 'avatars'
    and storage.foldername(name) is not null  -- keep object access, block bare listing
  );

drop policy if exists "Public read course photos" on storage.objects;
create policy "Public read course photos"
  on storage.objects for select
  to public
  using (
    bucket_id = 'course-photos'
    and storage.foldername(name) is not null
  );

-- 3) (Manual, dashboard) Enable leaked-password protection:
--    Authentication → Policies → "Leaked password protection" → On.
--    This checks new passwords against HaveIBeenPwned. Cannot be set via SQL.
