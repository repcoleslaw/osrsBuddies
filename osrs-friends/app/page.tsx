// app/page.tsx
'use client';

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

async function getPlayers() {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (!players) return [];

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

  return enriched;
}

export default async function HomePage() {
  const players = await getPlayers();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-4">OSRS Friends Hub</h1>

      <AddPlayerForm />

      <section className="space-y-3">
        {players.length === 0 && (
          <p className="text-sm text-gray-500">No players yet. Add one above.</p>
        )}

        {players.map((p: any) => (
          <article
            key={p.id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <Link href={`/player/${encodeURIComponent(p.osrs_username)}`}>
                <div className="font-semibold cursor-pointer hover:underline">
                  {p.display_name || p.osrs_username}
                </div>
              </Link>
              <div className="text-xs text-gray-500">
                @{p.osrs_username}
              </div>
              {p.latestStatus && (
                <p className="text-sm mt-2 italic">
                  “{p.latestStatus.message}”
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              {p.latestStats ? (
                <>
                  <div>Total lvl: {p.latestStats.total_level}</div>
                  <div>
                    XP:{' '}
                    {Number(p.latestStats.overall_xp).toLocaleString('en-US')}
                  </div>
                </>
              ) : (
                <span className="text-gray-400 text-xs">
                  No stats yet
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

// Tiny client component to POST /api/players


import { useState } from 'react';

function AddPlayerForm() {
  const [osrsUsername, setOsrsUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osrsUsername.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osrsUsername, displayName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Failed to add player');
      } else {
        // Simple: reload for now
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border rounded-lg p-4 flex flex-col gap-2"
    >
      <h2 className="font-semibold">Add a friend&apos;s OSRS account</h2>
      <input
        className="border rounded px-2 py-1 text-sm"
        placeholder="OSRS username"
        value={osrsUsername}
        onChange={(e) => setOsrsUsername(e.target.value)}
      />
      <input
        className="border rounded px-2 py-1 text-sm"
        placeholder="Display name (optional)"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-3 py-1 text-sm rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add account'}
      </button>
    </form>
  );
}
