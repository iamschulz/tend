// ---------------------------------------------------------------------------
// Types (inlined to avoid Nuxt path alias issues)
// ---------------------------------------------------------------------------

type Activity = { title: string; icon: string; emoji: string };
type Entry = {
  id: string;
  start: number;
  end: number;
  running: boolean;
  categoryId: string;
};
type Category = {
  id: string;
  title: string;
  activity: Activity;
  color: string;
};

export type SeedData = { categories: Category[]; entries: Entry[] };

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Constants — 5 categories
// ---------------------------------------------------------------------------

const CATEGORIES_DEF: Category[] = [
  {
    id: "seed-cat-1",
    title: "Work",
    activity: { title: "work", icon: "factory", emoji: "\u{1F3ED}" },
    color: "#00aaff",
  },
  {
    id: "seed-cat-2",
    title: "Sleep",
    activity: { title: "sleep", icon: "bed", emoji: "\u{1F634}" },
    color: "#8700b8",
  },
  {
    id: "seed-cat-3",
    title: "Exercise",
    activity: { title: "excercise", icon: "exercise", emoji: "\u{1F3CB}\u{FE0F}" },
    color: "#00ff73",
  },
  {
    id: "seed-cat-4",
    title: "Coffee",
    activity: { title: "coffee", icon: "coffee", emoji: "\u2615" },
    color: "#ffc400",
  },
  {
    id: "seed-cat-5",
    title: "Commute",
    activity: { title: "commute", icon: "commute", emoji: "\u{1F68C}" },
    color: "#ff0059",
  },
];

// ---------------------------------------------------------------------------
// Edge case entries (multi-day spans)
// ---------------------------------------------------------------------------

interface EdgeCase {
  label: string;
  categoryId: string;
  start: number;
  end: number;
  id: string;
}

const edgeCases: EdgeCase[] = [
  {
    label: "2-day work entry (Jun 15 22:00 → Jun 16 02:00)",
    categoryId: "seed-cat-1",
    start: Date.UTC(2025, 5, 15, 22, 0),
    end: Date.UTC(2025, 5, 16, 2, 0),
    id: "seed-edge-2day",
  },
  {
    label: "3-day entry (Aug 1 Fri 20:00 → Aug 3 Sun 10:00)",
    categoryId: "seed-cat-2",
    start: Date.UTC(2025, 7, 1, 20, 0),
    end: Date.UTC(2025, 7, 3, 10, 0),
    id: "seed-edge-3day",
  },
  {
    label: "8-day vacation entry (Oct 10 08:00 → Oct 17 18:00)",
    categoryId: "seed-cat-1",
    start: Date.UTC(2025, 9, 10, 8, 0),
    end: Date.UTC(2025, 9, 17, 18, 0),
    id: "seed-edge-8day",
  },
];

// ---------------------------------------------------------------------------
// generateSeedData
// ---------------------------------------------------------------------------

export function generateSeedData(): SeedData {
  const rand = mulberry32(42);

  function randInt(min: number, max: number): number {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  function chance(probability: number): boolean {
    return rand() < probability;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  let entryCounter = 0;

  function nextEntryId(): string {
    entryCounter++;
    return `seed-entry-${String(entryCounter).padStart(4, "0")}`;
  }

  function makeEntry(
    categoryId: string,
    start: number,
    end: number,
    id?: string
  ): Entry {
    return {
      id: id ?? nextEntryId(),
      start,
      end,
      running: false,
      categoryId,
    };
  }

  /** Day of week: 0 = Sunday, 6 = Saturday */
  function dayOfWeek(year: number, month: number, day: number): number {
    return new Date(Date.UTC(year, month, day)).getUTCDay();
  }

  function isWeekend(year: number, month: number, day: number): boolean {
    const dow = dayOfWeek(year, month, day);
    return dow === 0 || dow === 6;
  }

  function utc(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number
  ): number {
    return Date.UTC(year, month, day, hours, minutes);
  }

  // -------------------------------------------------------------------------
  // Entry generators (per day)
  // -------------------------------------------------------------------------

  function generateSleepEntries(
    year: number,
    month: number,
    day: number
  ): Entry[] {
    const entries: Entry[] = [];

    // ~90% of nights generate a sleep entry starting this evening
    if (!chance(0.9)) return entries;

    const weekend = isWeekend(year, month, day);

    // Sleep start: 22:00–00:30 (weekends shift later by ~1h)
    let startHour = randInt(22, 24);
    const startMin = randInt(0, 59);
    if (weekend) {
      startHour += 1;
    }

    // Sleep end next morning: 05:30–08:00 (weekends shift later)
    let endHour = randInt(5, 7);
    let endMin = randInt(0, 59);
    if (weekend) {
      endHour += randInt(1, 2);
    }
    if (endHour === 5) endMin = Math.max(endMin, 30); // at least 05:30

    // Calculate timestamps — start might roll into next day
    let startDay = day;
    let startMonth = month;
    let startYear = year;
    let actualStartHour = startHour;
    if (startHour >= 24) {
      // Rolls into next day
      actualStartHour = startHour - 24;
      const d = new Date(Date.UTC(year, month, day + 1));
      startDay = d.getUTCDate();
      startMonth = d.getUTCMonth();
      startYear = d.getUTCFullYear();
    }

    const start = utc(startYear, startMonth, startDay, actualStartHour, startMin);

    // End is always the next morning relative to the original day
    const nextMorning = new Date(Date.UTC(year, month, day + 1));
    const end = utc(
      nextMorning.getUTCFullYear(),
      nextMorning.getUTCMonth(),
      nextMorning.getUTCDate(),
      endHour,
      endMin
    );

    if (end > start) {
      entries.push(makeEntry("seed-cat-2", start, end));
    }

    return entries;
  }

  function generateWorkEntries(
    year: number,
    month: number,
    day: number
  ): Entry[] {
    const entries: Entry[] = [];
    if (isWeekend(year, month, day)) return entries;

    // Morning block: 08:30–09:30 start, 12:00–13:00 end
    const morningStart = utc(year, month, day, randInt(8, 9), randInt(0, 59));
    const morningEnd = utc(year, month, day, 12, randInt(0, 59));
    entries.push(makeEntry("seed-cat-1", morningStart, morningEnd));

    // Afternoon block (~85% of days)
    if (chance(0.85)) {
      const afternoonStart = utc(year, month, day, 13, randInt(0, 45));
      const afternoonEnd = utc(
        year,
        month,
        day,
        randInt(16, 18),
        randInt(0, 59)
      );
      entries.push(makeEntry("seed-cat-1", afternoonStart, afternoonEnd));
    }

    return entries;
  }

  function generateCommuteEntries(
    year: number,
    month: number,
    day: number
  ): Entry[] {
    const entries: Entry[] = [];
    if (isWeekend(year, month, day)) return entries;

    // Morning commute (~80%)
    if (chance(0.8)) {
      const startMin = randInt(0, 30);
      const durationMin = randInt(30, 90);
      const start = utc(year, month, day, 7, startMin);
      const end = start + durationMin * 60_000;
      entries.push(makeEntry("seed-cat-5", start, end));
    }

    // Evening commute (~75%)
    if (chance(0.75)) {
      const startHour = randInt(17, 18);
      const startMin = randInt(0, 59);
      const durationMin = randInt(30, 90);
      const start = utc(year, month, day, startHour, startMin);
      const end = start + durationMin * 60_000;
      entries.push(makeEntry("seed-cat-5", start, end));
    }

    return entries;
  }

  function generateExerciseEntries(
    year: number,
    month: number,
    day: number
  ): Entry[] {
    const entries: Entry[] = [];

    // ~40% chance on any given day (yields 2–4 days/week on average)
    if (!chance(0.4)) return entries;

    const startHour = randInt(15, 20);
    const startMin = randInt(0, 59);
    const durationMin = randInt(30, 90);
    const start = utc(year, month, day, startHour, startMin);
    const end = start + durationMin * 60_000;
    entries.push(makeEntry("seed-cat-3", start, end));

    return entries;
  }

  function generateCoffeeEntries(
    year: number,
    month: number,
    day: number
  ): Entry[] {
    const entries: Entry[] = [];

    // 0–5 coffees per day (weighted toward 1–3)
    const count = Math.max(0, randInt(-1, 4)); // -1,0 map to 0
    for (let i = 0; i < count; i++) {
      const hour = randInt(7, 20);
      const min = randInt(0, 59);
      const ts = utc(year, month, day, hour, min);
      // Instant entries: start === end
      entries.push(makeEntry("seed-cat-4", ts, ts));
    }

    return entries;
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  const categories: Category[] = [...CATEGORIES_DEF];
  const entries: Entry[] = [];

  // Inject edge case entries first
  for (const ec of edgeCases) {
    entries.push(makeEntry(ec.categoryId, ec.start, ec.end, ec.id));
  }

  // Date range: 2025-01-01 through 2026-01-01, plus yesterday and today
  const startDate = new Date(Date.UTC(2025, 0, 1));
  const fixedEndDate = new Date(Date.UTC(2026, 0, 1));

  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  // Collect all days to generate: the fixed range + yesterday + today (deduplicated via Set)
  const daySet = new Set<number>();
  const addDay = (d: Date) => daySet.add(d.getTime());

  const cursor = new Date(startDate);
  while (cursor <= fixedEndDate) {
    addDay(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  addDay(yesterdayUTC);
  addDay(todayUTC);

  const allDays = [...daySet].sort((a, b) => a - b);

  for (const dayMs of allDays) {
    const dt = new Date(dayMs);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const d = dt.getUTCDate();

    entries.push(
      ...generateSleepEntries(y, m, d),
      ...generateWorkEntries(y, m, d),
      ...generateCommuteEntries(y, m, d),
      ...generateExerciseEntries(y, m, d),
      ...generateCoffeeEntries(y, m, d),
    );
  }

  entries.sort((a, b) => a.start - b.start);

  return { categories, entries };
}
