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
  comment: string;
};
type Category = {
  id: string;
  title: string;
  activity: Activity;
  color: string;
  hidden: boolean;
  comment: string;
};
type Day = {
  date: string; // YYYY-MM-DD
  notes: string;
};

export type SeedData = { categories: Category[]; entries: Entry[]; days: Day[] };

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

/**
 * Seeded PRNG using the mulberry32 algorithm.
 * @param seed - The initial seed value
 */
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

const CAT_WORK     = '00000000-0000-4000-8000-000000000001'
const CAT_SLEEP    = '00000000-0000-4000-8000-000000000002'
const CAT_EXERCISE = '00000000-0000-4000-8000-000000000003'
const CAT_COFFEE   = '00000000-0000-4000-8000-000000000004'
const CAT_COMMUTE  = '00000000-0000-4000-8000-000000000005'

const CATEGORIES_DEF: Category[] = [
  {
    id: CAT_WORK,
    title: "Work",
    activity: { title: "work", icon: "factory", emoji: "\u{1F3ED}" },
    color: "#00aaff",
    hidden: false,
    comment: 'All work-related tasks and meetings',
  },
  {
    id: CAT_SLEEP,
    title: "Sleep",
    activity: { title: "sleep", icon: "bed", emoji: "\u{1F634}" },
    color: "#8700b8",
    hidden: false,
    comment: '',
  },
  {
    id: CAT_EXERCISE,
    title: "Exercise",
    activity: { title: "excercise", icon: "exercise", emoji: "\u{1F3CB}\u{FE0F}" },
    color: "#00ff73",
    hidden: false,
    comment: 'Gym, running, yoga, and other physical activities',
  },
  {
    id: CAT_COFFEE,
    title: "Coffee",
    activity: { title: "coffee", icon: "coffee", emoji: "\u2615" },
    color: "#ffc400",
    hidden: false,
    comment: '',
  },
  {
    id: CAT_COMMUTE,
    title: "Commute",
    activity: { title: "commute", icon: "commute", emoji: "\u{1F68C}" },
    color: "#ff0059",
    hidden: false,
    comment: 'Daily commute to and from the office',
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
    categoryId: CAT_WORK,
    start: Date.UTC(2025, 5, 15, 22, 0),
    end: Date.UTC(2025, 5, 16, 2, 0),
    id: "00000000-0000-4000-8000-e00000000001",
  },
  {
    label: "3-day entry (Aug 1 Fri 20:00 → Aug 3 Sun 10:00)",
    categoryId: CAT_SLEEP,
    start: Date.UTC(2025, 7, 1, 20, 0),
    end: Date.UTC(2025, 7, 3, 10, 0),
    id: "00000000-0000-4000-8000-e00000000002",
  },
  {
    label: "8-day vacation entry (Oct 10 08:00 → Oct 17 18:00)",
    categoryId: CAT_WORK,
    start: Date.UTC(2025, 9, 10, 8, 0),
    end: Date.UTC(2025, 9, 17, 18, 0),
    id: "00000000-0000-4000-8000-e00000000003",
  },
];

// ---------------------------------------------------------------------------
// generateSeedData
// ---------------------------------------------------------------------------

/** Generates deterministic seed data for development/testing. */
export function generateSeedData(): SeedData {
  const rand = mulberry32(42);

  /**
   * Returns a random integer in [min, max].
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   */
  function randInt(min: number, max: number): number {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  /**
   * Returns true with the given probability.
   * @param probability - A value between 0 and 1
   */
  function chance(probability: number): boolean {
    return rand() < probability;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  let entryCounter = 0;

  /** Returns a sequential entry ID as a valid UUID. */
  function nextEntryId(): string {
    entryCounter++;
    const hex = entryCounter.toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${hex}`;
  }

  const dayNotesPool: string[] = [
    'Felt tired all day, need an early night.',
    'Great mood, productive from the start.',
    'Migraine in the afternoon, powered through.',
    'Woke up super refreshed for once.',
    'Lunch with Sarah at the new place, amazing ramen.',
    'Sun was out, walked home the long way.',
    'Nothing special — a quiet, good day.',
    'Back pain flared up, ice in the evening.',
    'Finished the book I\'ve been stuck on for weeks!',
    'Called mom, catching up is always good.',
    'Rainy day, didn\'t leave the house once.',
    'Hit a new 5k PR — felt unstoppable.',
    'Couldn\'t focus, too many meetings.',
    'Tried cooking Thai curry from scratch, worth it.',
    'Long phone call with an old friend — made my week.',
    'Dentist appointment. Survived.',
    'First snow of the season, excited.',
    'Lost track of time on a coding rabbit hole.',
    'Kids were sick, rearranged the whole day.',
    'Gym after months — knees hate me.',
    'Bought a new coffee grinder, worth every euro.',
    'Skipped lunch, regretted it by 3pm.',
    'Nice dinner out with the team, celebrating the launch.',
    'Allergies were brutal today.',
    'Finally booked flights for the trip.',
    'Watched the sunset from the roof, worth the climb.',
    'Deep cleaned the kitchen — felt weirdly satisfying.',
    'Bumped into an old coworker at the market.',
    'Insomnia again, gave up and read until 3am.',
    'Slept in and it felt like a crime and a gift.',
  ]

  // Fixed notes tied to notable events in the seed timeline — these let
  // testers verify the search/day-notes UX against known dates.
  const fixedDayNotes: Record<string, string> = {
    '2025-01-01': 'New Year\'s Day — a fresh start. Big plans for the year.',
    '2025-06-15': 'Long night shipping the Q2 release. Slept four hours.',
    '2025-08-01': 'Weekend getaway with friends — finally unplugging.',
    '2025-10-10': 'First day of vacation! Landed late, exhausted but happy.',
    '2025-10-17': 'Back from vacation. Inbox is a crime scene.',
    '2025-12-24': 'Christmas Eve — cozy evening, too much food.',
    '2025-12-31': 'End-of-year reflection: tough but good. On to 2026.',
  }

  /**
   * Builds a YYYY-MM-DD string in UTC from a Date.
   * @param d - The date to format (UTC components are used)
   */
  function toDateStr(d: Date): string {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const commentPool: Record<string, string[]> = {
    [CAT_WORK]: [
      'Sprint planning meeting',
      'Code review session',
      'Deployed new feature to staging',
      'Fixed production bug',
      'Pair programming with Alex',
      'Wrote unit tests for auth module',
      'Database migration',
      'Client call went well',
      'Refactored payment flow',
      'Onboarding new team member',
    ],
    [CAT_SLEEP]: [
      'Slept great',
      'Woke up once during the night',
      'Couldn\'t fall asleep easily',
      'Had a weird dream',
      'Tried new pillow',
      'Need to fix the blinds',
    ],
    [CAT_EXERCISE]: [
      'Leg day',
      'Upper body focus',
      '5k run in the park',
      'Yoga session',
      'HIIT workout',
      'Swimming laps',
      'Felt really good today',
      'Pushed through the last set',
    ],
    [CAT_COFFEE]: [
      'Oat milk latte',
      'Double espresso',
      'Tried the new blend',
      'Cold brew',
      'Decaf for once',
      'Coffee with Sarah',
    ],
    [CAT_COMMUTE]: [
      'Heavy traffic today',
      'Took the train instead',
      'Listened to a great podcast',
      'Nice weather for cycling',
      'Bus was late again',
      'Road works on the highway',
    ],
  }

  /**
   * Picks a random comment for a category (30% chance of having one).
   * @param categoryId - The category to pick a comment for
   */
  function pickComment(categoryId: string): string {
    if (!chance(0.3)) return ''
    const pool = commentPool[categoryId]
    if (!pool) return ''
    return pool[randInt(0, pool.length - 1)]!
  }

  /**
   * Creates an entry object.
   * @param categoryId - The category this entry belongs to
   * @param start - Start timestamp
   * @param end - End timestamp
   * @param id - Optional custom ID
   */
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
      comment: pickComment(categoryId),
    };
  }

  /**
   * Day of week: 0 = Sunday, 6 = Saturday.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
  function dayOfWeek(year: number, month: number, day: number): number {
    return new Date(Date.UTC(year, month, day)).getUTCDay();
  }

  /**
   * Checks if a date falls on a weekend.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
  function isWeekend(year: number, month: number, day: number): boolean {
    const dow = dayOfWeek(year, month, day);
    return dow === 0 || dow === 6;
  }

  /**
   * Shorthand for Date.UTC.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   * @param hours - Hours
   * @param minutes - Minutes
   */
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

  /**
   * Generates sleep entries for a given day.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
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
      entries.push(makeEntry(CAT_SLEEP, start, end));
    }

    return entries;
  }

  /**
   * Generates work entries for a given weekday.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
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
    entries.push(makeEntry(CAT_WORK, morningStart, morningEnd));

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
      entries.push(makeEntry(CAT_WORK, afternoonStart, afternoonEnd));
    }

    return entries;
  }

  /**
   * Generates commute entries for a given weekday.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
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
      entries.push(makeEntry(CAT_COMMUTE, start, end));
    }

    // Evening commute (~75%)
    if (chance(0.75)) {
      const startHour = randInt(17, 18);
      const startMin = randInt(0, 59);
      const durationMin = randInt(30, 90);
      const start = utc(year, month, day, startHour, startMin);
      const end = start + durationMin * 60_000;
      entries.push(makeEntry(CAT_COMMUTE, start, end));
    }

    return entries;
  }

  /**
   * Generates exercise entries for a given day (~40% chance).
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
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
    entries.push(makeEntry(CAT_EXERCISE, start, end));

    return entries;
  }

  /**
   * Generates coffee (instant) entries for a given day.
   * @param year - The year
   * @param month - The month (0-indexed)
   * @param day - The day of the month
   */
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
      entries.push(makeEntry(CAT_COFFEE, ts, ts));
    }

    return entries;
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  const categories: Category[] = [...CATEGORIES_DEF];
  const entries: Entry[] = [];
  const days: Day[] = [];

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
  /** @param d - The date to add to the set */
  const addDay = (d: Date) => daySet.add(d.getTime());

  const cursor = new Date(startDate);
  while (cursor <= fixedEndDate) {
    addDay(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  addDay(yesterdayUTC);
  addDay(todayUTC);

  const allDays = [...daySet].sort((a, b) => a - b);

  const todayStr = toDateStr(todayUTC)
  const yesterdayStr = toDateStr(yesterdayUTC)

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

    const dateStr = toDateStr(dt)
    const fixed = fixedDayNotes[dateStr]
    if (fixed) {
      days.push({ date: dateStr, notes: fixed })
    } else if (dateStr === todayStr || dateStr === yesterdayStr || chance(0.1)) {
      // Today + yesterday always get a note so the search/daily-notes
      // UX has something fresh to show; other days get a ~10% sprinkle.
      days.push({ date: dateStr, notes: dayNotesPool[randInt(0, dayNotesPool.length - 1)]! })
    }
  }

  entries.sort((a, b) => a.start - b.start);
  days.sort((a, b) => a.date.localeCompare(b.date));

  return { categories, entries, days };
}
