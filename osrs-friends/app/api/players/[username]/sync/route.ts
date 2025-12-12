// app/api/players/[username]/sync/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchOsrsStats } from '@/lib/osrs';

type Params = { params: { username: string } };

export async function POST(_req: Request, { params }: Params) {
  const username = decodeURIComponent(params.username);

  // Find the player
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('osrs_username', username)
    .single();

  if (error || !player) {
    return NextResponse.json(
      { error: 'Player not found' },
      { status: 404 }
    );
  }

  try {
    const stats = await fetchOsrsStats(username);

    const { error: updateError } = await supabase
      .from('players')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', player.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: insertError } = await supabase.from('player_stats').insert({
      player_id: player.id,
      total_level: stats.totalLevel,
      overall_xp: stats.overallXp,
      skills: stats.skillsRaw,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ playerId: player.id, stats });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Failed to resync stats' },
      { status: 500 }
    );
  }
}
