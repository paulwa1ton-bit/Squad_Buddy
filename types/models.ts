// Core domain model for Squad Buddy

export type AgeGroup =
  | "U7" | "U8" | "U9" | "U10" | "U11" | "U12" | "U13" | "U14" | "U15" | "U16";

export type MatchFormat = "5v5" | "7v7" | "9v9" | "11v11";

export type PeriodType = "halves" | "quarters";

export interface FAAgeGroupGuideline {
  ageGroup: AgeGroup;
  format: MatchFormat;
  playersPerSide: number;
  maxSquadSize: number;
  defaultPeriodType: PeriodType;
  periodTypeIsLeagueChoice: boolean; // true when the FA allows either and the league decides
  minutesPerPeriod: number; // for the default period type
  ballSize: number;
  pitchSizeYards: { length: number; width: number };
  notes: string[];
}

export type PlayingPosition =
  | "GK"
  | "LB" | "CB" | "RB" | "LWB" | "RWB" | "SW"
  | "CDM" | "CM" | "LM" | "RM" | "CAM"
  | "LW" | "RW" | "ST" | "CF";

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // ISO date
  shirtNumber?: number;
  primaryPositions: PlayingPosition[]; // manager can assign multiple positions
  photoUri?: string;
  parentId?: string; // linked registered parent/guardian
  archived: boolean;
  createdAt: string;
}

export interface SeasonStatsTotals {
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface FormationSlot {
  id: string;
  position: PlayingPosition;
  // Normalized 0-1 coordinates so the same layout scales to any pitch view
  x: number;
  y: number;
  label?: string; // e.g. "LB", "9" - defaults to position
}

export interface Formation {
  id: string;
  teamId: string;
  name: string; // e.g. "2-3-1", "1-3-3-1 Diamond"
  format: MatchFormat;
  slots: FormationSlot[];
  isPreset: boolean; // built-in vs manager-created
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  league: string;
  ageGroup: AgeGroup;
  format: MatchFormat;
  periodType: PeriodType;
  minutesPerPeriod: number;
  logoUri?: string;
  homePhotoUri?: string;
  managerUserId: string;
  createdAt: string;
}

export type MatchEventType =
  | "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "own_goal";

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  playerId?: string; // player the event applies to (scorer, carded player, sub coming on)
  relatedPlayerId?: string; // e.g. assist provider for a goal, or player going off for a sub
  minute: number; // match-clock minute at time of event
  period: number; // 1-based period index
  createdAt: string;
}

export interface PlayerMatchEntry {
  playerId: string;
  isStarter: boolean;
  positionAtStart?: PlayingPosition;
  secondsPlayed: number; // running total, updated live
  onFieldSince?: string; // ISO timestamp, undefined when on the bench
  currentPosition?: PlayingPosition;
}

export type MatchStatus = "scheduled" | "live" | "paused" | "completed";

export interface Match {
  id: string;
  teamId: string;
  opposition: string;
  location?: string;
  kickOff: string; // ISO datetime
  isHome: boolean;
  format: MatchFormat;
  periodType: PeriodType;
  minutesPerPeriod: number;
  formationId?: string;
  squadPlayerIds: string[]; // players selected for this match day
  lineup: PlayerMatchEntry[];
  status: MatchStatus;
  currentPeriod: number;
  periodStartedAt?: string; // ISO timestamp when the current period's clock last started
  elapsedSecondsBeforeCurrentStart: number; // accumulated seconds when paused/between periods
  events: MatchEvent[];
  teamScore: number;
  oppositionScore: number;
  notifiedParentIds: string[];
  createdAt: string;
}

export type RsvpStatus = "pending" | "accepted" | "declined";

export interface MatchInvite {
  id: string;
  matchId: string;
  playerId: string;
  parentId: string;
  status: RsvpStatus;
  respondedAt?: string;
  createdAt: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string;
  childPlayerIds: string[];
  pushToken?: string;
  createdAt: string;
}

export type ManagerRole = "manager" | "coach" | "assistant";

export interface ManagerProfile {
  id: string; // matches Firebase Auth uid
  name: string;
  email: string;
  role: ManagerRole;
  teamIds: string[];
}

export interface SubstitutionSuggestion {
  playerOffId: string;
  playerOnId: string;
  reason: string;
  score: number; // higher = stronger recommendation
}

export interface GuidelineDoc {
  id: string;
  category: "fa_guideline" | "referee_law";
  title: string;
  summary: string;
  body: string;
  tags: string[];
  sourceUrl?: string;
  lastUpdated: string; // ISO date the reference content was verified
}
