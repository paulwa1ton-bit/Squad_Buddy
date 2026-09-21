import { AgeGroup, FAAgeGroupGuideline, GuidelineDoc } from "@/types/models";

// Verified against FA / county FA grassroots small-sided football regulations
// for the 2025/26 season. Leagues set their own exact squad and matchday
// limits, so figures here are the FA's recommended defaults — managers
// should confirm specifics in their own league handbook.
export const FA_AGE_GROUP_GUIDELINES: Record<AgeGroup, FAAgeGroupGuideline> = {
  U7: {
    ageGroup: "U7",
    format: "5v5",
    playersPerSide: 5,
    maxSquadSize: 12,
    defaultPeriodType: "quarters",
    periodTypeIsLeagueChoice: true,
    minutesPerPeriod: 10,
    ballSize: 3,
    pitchSizeYards: { length: 30, width: 20 },
    notes: [
      "No goalkeepers at U7 in most leagues — check local rules.",
      "Halves or quarters is a league decision; quarters are common to help rotate players evenly.",
      "Focus on maximum touches and enjoyment over results.",
    ],
  },
  U8: {
    ageGroup: "U8",
    format: "5v5",
    playersPerSide: 5,
    maxSquadSize: 12,
    defaultPeriodType: "quarters",
    periodTypeIsLeagueChoice: true,
    minutesPerPeriod: 10,
    ballSize: 3,
    pitchSizeYards: { length: 40, width: 30 },
    notes: [
      "20 minutes per half total, commonly split into four 10-minute quarters.",
      "Rolling substitutions are standard — everyone should get near-equal game time.",
    ],
  },
  U9: {
    ageGroup: "U9",
    format: "7v7",
    playersPerSide: 7,
    maxSquadSize: 14,
    defaultPeriodType: "quarters",
    periodTypeIsLeagueChoice: true,
    minutesPerPeriod: 12,
    ballSize: 3,
    pitchSizeYards: { length: 50, width: 30 },
    notes: [
      "25 minutes per half total; leagues may split into quarters instead.",
      "Introduces a goalkeeper.",
    ],
  },
  U10: {
    ageGroup: "U10",
    format: "7v7",
    playersPerSide: 7,
    maxSquadSize: 14,
    defaultPeriodType: "quarters",
    periodTypeIsLeagueChoice: true,
    minutesPerPeriod: 12,
    ballSize: 3,
    pitchSizeYards: { length: 60, width: 40 },
    notes: [
      "25 minutes per half total.",
      "Rolling substitutions remain the norm to keep game time equitable.",
    ],
  },
  U11: {
    ageGroup: "U11",
    format: "9v9",
    playersPerSide: 9,
    maxSquadSize: 16,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 30,
    ballSize: 4,
    pitchSizeYards: { length: 80, width: 50 },
    notes: [
      "30-minute halves.",
      "Maximum permitted playing time in a single day is 80 minutes — track this if a player turns out twice (e.g. cup + league).",
    ],
  },
  U12: {
    ageGroup: "U12",
    format: "9v9",
    playersPerSide: 9,
    maxSquadSize: 16,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 30,
    ballSize: 4,
    pitchSizeYards: { length: 80, width: 50 },
    notes: [
      "30-minute halves.",
      "Maximum permitted playing time in a single day is 80 minutes.",
    ],
  },
  U13: {
    ageGroup: "U13",
    format: "11v11",
    playersPerSide: 11,
    maxSquadSize: 18,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 35,
    ballSize: 4,
    pitchSizeYards: { length: 90, width: 55 },
    notes: ["35-minute halves.", "First step up to full 11-a-side football."],
  },
  U14: {
    ageGroup: "U14",
    format: "11v11",
    playersPerSide: 11,
    maxSquadSize: 18,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 35,
    ballSize: 4,
    pitchSizeYards: { length: 90, width: 55 },
    notes: ["35-minute halves."],
  },
  U15: {
    ageGroup: "U15",
    format: "11v11",
    playersPerSide: 11,
    maxSquadSize: 18,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 40,
    ballSize: 5,
    pitchSizeYards: { length: 100, width: 60 },
    notes: ["40-minute halves.", "Moves to a full size 5 ball."],
  },
  U16: {
    ageGroup: "U16",
    format: "11v11",
    playersPerSide: 11,
    maxSquadSize: 18,
    defaultPeriodType: "halves",
    periodTypeIsLeagueChoice: false,
    minutesPerPeriod: 40,
    ballSize: 5,
    pitchSizeYards: { length: 100, width: 60 },
    notes: ["40-minute halves."],
  },
};

export const AGE_GROUPS: AgeGroup[] = [
  "U7", "U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16",
];

// Searchable FA guideline reference documents shown in the in-app reference library.
export const FA_GUIDELINE_DOCS: GuidelineDoc[] = [
  ...Object.values(FA_AGE_GROUP_GUIDELINES).map((g): GuidelineDoc => ({
    id: `fa-age-${g.ageGroup}`,
    category: "fa_guideline",
    title: `${g.ageGroup} - ${g.format} format`,
    summary: `${g.playersPerSide}-a-side, ${g.minutesPerPeriod} min ${g.defaultPeriodType}, size ${g.ballSize} ball.`,
    body: [
      `Format: ${g.format} (${g.playersPerSide} players per side, max squad ${g.maxSquadSize}).`,
      `Match length: ${g.minutesPerPeriod} minutes per period, played in ${g.defaultPeriodType}${g.periodTypeIsLeagueChoice ? " (leagues may choose halves or quarters)" : ""}.`,
      `Ball size: ${g.ballSize}.`,
      `Pitch size: approx. ${g.pitchSizeYards.length} x ${g.pitchSizeYards.width} yards.`,
      ...g.notes,
    ].join("\n"),
    tags: [g.ageGroup, g.format, "match format", "duration", "squad size"],
    sourceUrl: "https://www.thefa.com/football-rules-governance/policies/youth-football",
    lastUpdated: "2025-09-01",
  })),
  {
    id: "fa-equitable-playtime",
    category: "fa_guideline",
    title: "Equitable playing time in grassroots football",
    summary: "FA guidance encourages rolling substitutions so every player gets meaningful game time.",
    body:
      "The FA's grassroots philosophy for mini-soccer and youth football (U7-U12 especially) " +
      "prioritises participation and development over results. Rolling substitutions are " +
      "encouraged so that, as far as is practical, every player in the squad gets a fair " +
      "share of game time across a season. It will not always be possible to make it exactly " +
      "equal in any single match, but managers are encouraged to track minutes over the " +
      "season and balance selection and substitution decisions accordingly.",
    tags: ["playing time", "substitutions", "equity", "development"],
    sourceUrl: "https://www.thefa.com/football-rules-governance/policies/youth-football",
    lastUpdated: "2025-09-01",
  },
  {
    id: "fa-daily-max-playtime",
    category: "fa_guideline",
    title: "Maximum permitted playing time per day (9v9 and 11v11)",
    summary: "U11/U12 players are capped at 80 minutes of match play in a single day.",
    body:
      "To protect younger players from overplaying, the FA sets a maximum permitted playing " +
      "time per day. For 9v9 (U11/U12) this is 80 minutes total match time in one day, even " +
      "across multiple fixtures (e.g. a league game and a cup game). Managers should track a " +
      "player's total minutes for the day, not just per fixture, when this applies.",
    tags: ["safeguarding", "playing time", "U11", "U12", "9v9"],
    sourceUrl: "https://www.thefa.com/football-rules-governance/policies/youth-football",
    lastUpdated: "2025-09-01",
  },
];
