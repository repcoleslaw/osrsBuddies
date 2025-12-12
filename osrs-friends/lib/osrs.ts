// lib/osrs.ts
export type OsrsSkillEntry = {
  rank: number;
  level: number;
  xp: number;
};

export type OsrsStats = {
  totalLevel: number;
  overallXp: number;
  skillsRaw: OsrsSkillEntry[];
};

/**
 * Fetch OSRS hiscores for a username from the official lite API.
 * Note: username must be exactly as on hiscores (case-insensitive).
 */
export async function fetchOsrsStats(username: string): Promise<OsrsStats> {
  const url =
    'https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=' +
    encodeURIComponent(username);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Hiscores request failed with status ${res.status}`);
  }

  const text = await res.text();
  const lines = text.trim().split('\n');

  // Each line: "rank,level,experience"
  const entries: OsrsSkillEntry[] = lines.map((line) => {
    const [rankStr, levelStr, xpStr] = line.split(',');
    return {
      rank: Number(rankStr),
      level: Number(levelStr),
      xp: Number(xpStr),
    };
  });

  // Line 0 is "Overall"
  const overall = entries[0];
  return {
    totalLevel: overall.level,
    overallXp: overall.xp,
    skillsRaw: entries,
  };
}
