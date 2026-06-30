-- Performance + security hardening for the GOLF app tables only.
-- (Leaves the finance-app tables — companies/incomes/outgoings/favourite_outgoings — untouched.)
--
-- Three parts, all zero behaviour change:
--   1. Wrap auth.uid() as (select auth.uid()) in RLS policies so Postgres
--      evaluates it ONCE per query instead of once per row (Supabase advisor
--      "auth_rls_initplan"). Same results, faster at scale.
--   2. Add covering indexes on foreign keys (advisor "unindexed_foreign_keys").
--   3. Revoke EXECUTE on handle_new_user() from PUBLIC (clears the last 2
--      security WARNs — it's a trigger fn, never meant to be a public RPC).
--
-- NOT included: consolidating "multiple permissive policies" — that can change
-- read visibility, so it needs a separate, deliberate decision.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. RLS: wrap auth.uid() -> (select auth.uid())
-- ─────────────────────────────────────────────────────────────────────────

-- challenges
alter policy "Users can create challenges"     on public.challenges     with check ((select auth.uid()) = challenger_id);
alter policy "Players can view their challenges" on public.challenges    using (((select auth.uid()) = challenger_id) or ((select auth.uid()) = opponent_id));
alter policy "Players can update challenges"    on public.challenges     using (((select auth.uid()) = challenger_id) or ((select auth.uid()) = opponent_id));

-- course_photos
alter policy "Users delete own course photos"  on public.course_photos  using (user_id = (select auth.uid()));
alter policy "Users insert own course photos"  on public.course_photos  with check (user_id = (select auth.uid()));

-- course_reviews
alter policy "Users can submit reviews"        on public.course_reviews with check ((select auth.uid()) = user_id);
alter policy "Users can update own review"     on public.course_reviews using ((select auth.uid()) = user_id);

-- courses
alter policy "Logged-in users can submit courses" on public.courses     with check ((select auth.uid()) = submitted_by);

-- favourites
alter policy "Users manage own favourites"     on public.favourites     using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- follows
alter policy "Users manage own follows"        on public.follows        using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));

-- hole_scores
alter policy "Users manage own hole scores"    on public.hole_scores    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- matches
alter policy "Users can create matches"        on public.matches        with check ((select auth.uid()) = created_by);
alter policy "Players can view their matches"  on public.matches        using (((select auth.uid()) = player1_id) or ((select auth.uid()) = player2_id));
alter policy "Players can update their matches" on public.matches       using (((select auth.uid()) = player1_id) or ((select auth.uid()) = player2_id));

-- profiles
alter policy "Users manage own profile"        on public.profiles       using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "Users can update own profile"    on public.profiles       using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- round_likes
alter policy "Users manage own likes"          on public.round_likes    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- rounds
alter policy "Users manage own rounds"         on public.rounds         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- societies
alter policy "Authenticated users can create societies" on public.societies with check ((select auth.uid()) = created_by);
alter policy "Societies readable by members"   on public.societies      using (exists (
  select 1 from society_members
  where society_members.society_id = societies.id
    and society_members.user_id = (select auth.uid())));

-- society_members
alter policy "Users can leave societies"       on public.society_members using ((select auth.uid()) = user_id);
alter policy "Users can join societies"        on public.society_members with check ((select auth.uid()) = user_id);
alter policy "Members can view society members" on public.society_members using ((select auth.uid()) = user_id);

-- tournament_entries
alter policy "Users can enter tournaments"     on public.tournament_entries with check ((select auth.uid()) = user_id);
alter policy "Users can update own entry"      on public.tournament_entries using ((select auth.uid()) = user_id);

-- tournaments
alter policy "Authenticated users can create tournaments" on public.tournaments with check ((select auth.uid()) = created_by);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Covering indexes for foreign keys
-- ─────────────────────────────────────────────────────────────────────────
create index if not exists idx_challenges_challenger_id        on public.challenges(challenger_id);
create index if not exists idx_challenges_course_id            on public.challenges(course_id);
create index if not exists idx_challenges_opponent_id          on public.challenges(opponent_id);
create index if not exists idx_course_photos_user_id           on public.course_photos(user_id);
create index if not exists idx_course_reviews_user_id          on public.course_reviews(user_id);
create index if not exists idx_courses_submitted_by            on public.courses(submitted_by);
create index if not exists idx_favourites_course_id            on public.favourites(course_id);
create index if not exists idx_follows_following_id            on public.follows(following_id);
create index if not exists idx_hole_scores_round_id            on public.hole_scores(round_id);
create index if not exists idx_hole_scores_user_id             on public.hole_scores(user_id);
create index if not exists idx_matches_created_by              on public.matches(created_by);
create index if not exists idx_matches_player1_id              on public.matches(player1_id);
create index if not exists idx_matches_player2_id              on public.matches(player2_id);
create index if not exists idx_profiles_home_course_id         on public.profiles(home_course_id);
create index if not exists idx_round_likes_user_id             on public.round_likes(user_id);
create index if not exists idx_rounds_user_id                  on public.rounds(user_id);
create index if not exists idx_societies_created_by            on public.societies(created_by);
create index if not exists idx_society_members_user_id         on public.society_members(user_id);
create index if not exists idx_tournament_entries_round_id     on public.tournament_entries(round_id);
create index if not exists idx_tournament_entries_user_id      on public.tournament_entries(user_id);
create index if not exists idx_tournaments_created_by          on public.tournaments(created_by);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Lock down handle_new_user() (clears the last 2 security WARNs)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function public.handle_new_user() from public;

commit;
