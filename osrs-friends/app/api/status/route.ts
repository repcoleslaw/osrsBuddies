// app/api/status/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { playerId, message } = body || {};

  if (!playerId || !message?.trim()) {
    return NextResponse.json(
      { error: 'playerId and message are required' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('status_updates').insert({
    player_id: playerId,
    message: message.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
