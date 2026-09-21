import { Formation, FormationSlot, MatchFormat, PlayingPosition } from "@/types/models";

// Preset formations are global templates (teamId: "preset"). When a manager
// picks one for their team it is cloned into a real Formation with a fresh
// id/teamId via cloneFormationForTeam() below, so edits never mutate the preset.

let slotSeq = 0;
function slot(position: PlayingPosition, x: number, y: number, label?: string): FormationSlot {
  slotSeq += 1;
  return { id: `preset-slot-${slotSeq}`, position, x, y, label: label ?? position };
}

function preset(name: string, format: MatchFormat, slots: FormationSlot[]): Formation {
  return {
    id: `preset-${format}-${name.replace(/\s+/g, "-").toLowerCase()}`,
    teamId: "preset",
    name,
    format,
    slots,
    isPreset: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

// y: 0 = own goal line, 1 = opponent's goal line
export const FORMATION_PRESETS: Formation[] = [
  // ---------- 5v5 (GK + 4 outfield) ----------
  preset("1-2-1", "5v5", [
    slot("GK", 0.5, 0.08),
    slot("CB", 0.5, 0.32, "DEF"),
    slot("LM", 0.25, 0.58, "L"),
    slot("RM", 0.75, 0.58, "R"),
    slot("ST", 0.5, 0.85),
  ]),
  preset("2-2", "5v5", [
    slot("GK", 0.5, 0.08),
    slot("LB", 0.28, 0.35),
    slot("RB", 0.72, 0.35),
    slot("LW", 0.3, 0.78, "LF"),
    slot("RW", 0.7, 0.78, "RF"),
  ]),
  preset("1-1-2", "5v5", [
    slot("GK", 0.5, 0.08),
    slot("CB", 0.5, 0.3, "DEF"),
    slot("CM", 0.5, 0.55, "MID"),
    slot("LW", 0.3, 0.82, "LF"),
    slot("RW", 0.7, 0.82, "RF"),
  ]),

  // ---------- 7v7 (GK + 6 outfield) ----------
  preset("2-3-1", "7v7", [
    slot("LB", 0.3, 0.28),
    slot("RB", 0.7, 0.28),
    slot("GK", 0.5, 0.07),
    slot("LM", 0.18, 0.55),
    slot("CM", 0.5, 0.55),
    slot("RM", 0.82, 0.55),
    slot("ST", 0.5, 0.85),
  ]),
  preset("3-2-1", "7v7", [
    slot("GK", 0.5, 0.07),
    slot("LB", 0.18, 0.3),
    slot("CB", 0.5, 0.3),
    slot("RB", 0.82, 0.3),
    slot("LM", 0.32, 0.6),
    slot("RM", 0.68, 0.6),
    slot("ST", 0.5, 0.85),
  ]),
  preset("2-2-2", "7v7", [
    slot("GK", 0.5, 0.07),
    slot("LB", 0.3, 0.3),
    slot("RB", 0.7, 0.3),
    slot("LM", 0.3, 0.58),
    slot("RM", 0.7, 0.58),
    slot("LW", 0.3, 0.85, "LF"),
    slot("RW", 0.7, 0.85, "RF"),
  ]),
  preset("3-3 (no fwd)", "7v7", [
    slot("GK", 0.5, 0.07),
    slot("LB", 0.2, 0.3),
    slot("CB", 0.5, 0.3),
    slot("RB", 0.8, 0.3),
    slot("LM", 0.2, 0.65),
    slot("CM", 0.5, 0.65),
    slot("RM", 0.8, 0.65),
  ]),

  // ---------- 9v9 (GK + 8 outfield) ----------
  preset("3-3-2", "9v9", [
    slot("GK", 0.5, 0.06),
    slot("LB", 0.2, 0.28),
    slot("CB", 0.5, 0.25),
    slot("RB", 0.8, 0.28),
    slot("LM", 0.2, 0.55),
    slot("CM", 0.5, 0.55),
    slot("RM", 0.8, 0.55),
    slot("ST", 0.35, 0.85, "LS"),
    slot("CF", 0.65, 0.85, "RS"),
  ]),
  preset("3-2-3", "9v9", [
    slot("GK", 0.5, 0.06),
    slot("LB", 0.2, 0.28),
    slot("CB", 0.5, 0.25),
    slot("RB", 0.8, 0.28),
    slot("CDM", 0.35, 0.5),
    slot("CM", 0.65, 0.5),
    slot("LW", 0.2, 0.82),
    slot("ST", 0.5, 0.88),
    slot("RW", 0.8, 0.82),
  ]),
  preset("2-3-3", "9v9", [
    slot("GK", 0.5, 0.06),
    slot("LB", 0.3, 0.26),
    slot("RB", 0.7, 0.26),
    slot("LM", 0.2, 0.52),
    slot("CM", 0.5, 0.52),
    slot("RM", 0.8, 0.52),
    slot("LW", 0.2, 0.85),
    slot("ST", 0.5, 0.9),
    slot("RW", 0.8, 0.85),
  ]),
  preset("4-3-1", "9v9", [
    slot("GK", 0.5, 0.06),
    slot("LB", 0.15, 0.28),
    slot("CB", 0.4, 0.24),
    slot("CB", 0.6, 0.24, "CB"),
    slot("RB", 0.85, 0.28),
    slot("LM", 0.2, 0.55),
    slot("CM", 0.5, 0.58),
    slot("RM", 0.8, 0.55),
    slot("ST", 0.5, 0.87),
  ]),

  // ---------- 11v11 (GK + 10 outfield) ----------
  preset("4-4-2", "11v11", [
    slot("GK", 0.5, 0.05),
    slot("LB", 0.12, 0.25),
    slot("CB", 0.38, 0.22),
    slot("CB", 0.62, 0.22, "CB"),
    slot("RB", 0.88, 0.25),
    slot("LM", 0.15, 0.52),
    slot("CM", 0.4, 0.5),
    slot("CM", 0.6, 0.5, "CM"),
    slot("RM", 0.85, 0.52),
    slot("ST", 0.38, 0.85),
    slot("CF", 0.62, 0.85, "ST"),
  ]),
  preset("4-3-3", "11v11", [
    slot("GK", 0.5, 0.05),
    slot("LB", 0.12, 0.25),
    slot("CB", 0.38, 0.22),
    slot("CB", 0.62, 0.22, "CB"),
    slot("RB", 0.88, 0.25),
    slot("CDM", 0.5, 0.42),
    slot("CM", 0.3, 0.55),
    slot("CM", 0.7, 0.55, "CM"),
    slot("LW", 0.15, 0.85),
    slot("ST", 0.5, 0.9),
    slot("RW", 0.85, 0.85),
  ]),
  preset("4-2-3-1", "11v11", [
    slot("GK", 0.5, 0.05),
    slot("LB", 0.12, 0.25),
    slot("CB", 0.38, 0.22),
    slot("CB", 0.62, 0.22, "CB"),
    slot("RB", 0.88, 0.25),
    slot("CDM", 0.35, 0.42),
    slot("CDM", 0.65, 0.42, "CDM"),
    slot("LW", 0.18, 0.65),
    slot("CAM", 0.5, 0.68),
    slot("RW", 0.82, 0.65),
    slot("ST", 0.5, 0.9),
  ]),
  preset("3-5-2", "11v11", [
    slot("GK", 0.5, 0.05),
    slot("CB", 0.28, 0.22),
    slot("CB", 0.5, 0.2, "CB"),
    slot("CB", 0.72, 0.22, "CB"),
    slot("LWB", 0.08, 0.48),
    slot("CM", 0.35, 0.5),
    slot("CM", 0.65, 0.5, "CM"),
    slot("RWB", 0.92, 0.48),
    slot("CAM", 0.5, 0.68),
    slot("ST", 0.38, 0.88),
    slot("CF", 0.62, 0.88, "ST"),
  ]),
  preset("4-5-1", "11v11", [
    slot("GK", 0.5, 0.05),
    slot("LB", 0.12, 0.25),
    slot("CB", 0.38, 0.22),
    slot("CB", 0.62, 0.22, "CB"),
    slot("RB", 0.88, 0.25),
    slot("LM", 0.12, 0.52),
    slot("CM", 0.35, 0.5),
    slot("CM", 0.65, 0.5, "CM"),
    slot("RM", 0.88, 0.52),
    slot("CAM", 0.5, 0.68),
    slot("ST", 0.5, 0.9),
  ]),
];

export function getPresetsForFormat(format: MatchFormat): Formation[] {
  return FORMATION_PRESETS.filter((f) => f.format === format);
}

export function cloneFormationForTeam(
  preset: Formation,
  teamId: string,
  newId: string,
): Formation {
  return {
    ...preset,
    id: newId,
    teamId,
    isPreset: false,
    slots: preset.slots.map((s, i) => ({ ...s, id: `${newId}-slot-${i}` })),
    createdAt: new Date().toISOString(),
  };
}
