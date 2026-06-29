// Supabase Edge Function: delete-account
// Permanently deletes the calling user's data + their auth account.
// Deploy with:  supabase functions deploy delete-account
// (verify_jwt stays ON so only a signed-in user can delete THEIR OWN account.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const uid = userData.user.id;

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    // 1) Delete this user's storage files (avatars + course-photos), stored under a `${uid}/` prefix.
    for (const bucket of ['avatars', 'course-photos']) {
      const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
      if (files && files.length) {
        await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
      }
    }

    // 2) Delete DB rows in FK-safe order (children before parents).
    const roundIds =
      (await admin.from('rounds').select('id').eq('user_id', uid)).data?.map((r) => r.id) ?? [];

    await admin.from('hole_scores').delete().eq('user_id', uid);
    await admin.from('tournament_entries').delete().eq('user_id', uid);
    await admin.from('round_likes').delete().eq('user_id', uid);
    if (roundIds.length) await admin.from('round_likes').delete().in('round_id', roundIds);
    await admin.from('rounds').delete().eq('user_id', uid);
    await admin.from('favourites').delete().eq('user_id', uid);
    await admin.from('course_reviews').delete().eq('user_id', uid);
    await admin.from('course_photos').delete().eq('user_id', uid);
    await admin.from('society_members').delete().eq('user_id', uid);
    await admin.from('follows').delete().eq('follower_id', uid);
    await admin.from('follows').delete().eq('following_id', uid);
    await admin.from('challenges').delete().eq('challenger_id', uid);
    await admin.from('challenges').delete().eq('opponent_id', uid);
    await admin.from('matches').delete().eq('created_by', uid);
    await admin.from('matches').delete().eq('player1_id', uid);
    await admin.from('matches').delete().eq('player2_id', uid);
    await admin.from('tournaments').delete().eq('created_by', uid);
    await admin.from('societies').delete().eq('created_by', uid);
    await admin.from('courses').delete().eq('submitted_by', uid);
    await admin.from('profiles').delete().eq('id', uid);

    // 3) Finally delete the auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
