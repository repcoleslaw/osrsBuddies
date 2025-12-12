// app/api/players/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchOsrsStats } from '@/lib/osrs';

export async function GET() {
  // List players with latest stats and last status
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  if (!players || players.length === 0) {
    return NextResponse.json({ players: [] });
  }

  // For v1, do a separate query per player for latest stats & status.
  // You can optimize later with RPC or joins.
  const enriched = await Promise.all(
    players.map(async (p) => {
      const [{ data: stats }, { data: statuses }] = await Promise.all([
        supabase
          .from('player_stats')
          .select('*')
          .eq('player_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('status_updates')
          .select('*')
          .eq('player_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      return {
        ...p,
        latestStats: stats ?? null,
        latestStatus: statuses?.[0] ?? null,
      };
    })
  );

  return NextResponse.json({ players: enriched });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const osrsUsername = body?.osrsUsername?.trim();
  const displayName = body?.displayName?.trim() || null;

  if (!osrsUsername) {
    return NextResponse.json(
      { error: 'osrsUsername is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch stats from OSRS
    const stats = await fetchOsrsStats(osrsUsername);

    // Upsert player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .upsert(
        {
          osrs_username: osrsUsername,
          display_name: displayName,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'osrs_username' }
      )
      .select('*')
      .single();

    if (playerError || !player) {
      throw new Error(playerError?.message || 'Failed to upsert player');
    }

    // Insert stats snapshot
    const { error: statsError } = await supabase.from('player_stats').insert({
      player_id: player.id,
      total_level: stats.totalLevel,
      overall_xp: stats.overallXp,
      skills: stats.skillsRaw, // JSONB
    });

    if (statsError) {
      throw new Error(statsError.message);
    }

    return NextResponse.json({ player, stats }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
