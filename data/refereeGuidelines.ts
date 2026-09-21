import { GuidelineDoc } from "@/types/models";

// Reference summaries of the IFAB Laws of the Game (2025/26 edition, effective
// 1 July 2025) plus England grassroots-specific refereeing guidance. These are
// plain-English summaries for grassroots managers/coaches, not a substitute
// for the full Laws of the Game document.
export const REFEREE_GUIDELINE_DOCS: GuidelineDoc[] = [
  {
    id: "law-1-field",
    category: "referee_law",
    title: "Law 1 - The Field of Play",
    summary: "Pitch, goal and marking dimensions, adapted for small-sided grassroots formats.",
    body:
      "Defines pitch, goal and technical area dimensions. Grassroots small-sided formats " +
      "(5v5, 7v7, 9v9) use FA-recommended reduced pitch and goal sizes rather than the full " +
      "11v11 dimensions in the core Law — see the FA Guidelines section for age-group specifics.",
    tags: ["pitch", "field", "dimensions", "goals"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-field-of-play",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-2-ball",
    category: "referee_law",
    title: "Law 2 - The Ball",
    summary: "Ball size and condition requirements; grassroots ages use smaller ball sizes.",
    body:
      "Specifies size, weight and pressure of the match ball. Younger grassroots age groups " +
      "use smaller ball sizes (size 3 for U7-U10, size 4 for U11-U14, size 5 from U15) — see " +
      "the FA Guidelines section for the exact size per age group.",
    tags: ["ball", "equipment"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-ball",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-3-players",
    category: "referee_law",
    title: "Law 3 - The Players",
    summary: "Number of players, substitution procedure, and minimum players to continue a match.",
    body:
      "Covers squad sizes, number of substitutes and how substitutions are carried out. " +
      "Grassroots youth competitions typically allow rolling substitutions (a player can go " +
      "off and return later) which is not permitted in adult 11v11 competitive football under " +
      "the core Law — check your league handbook, as this is a competition-specific variation.",
    tags: ["substitutions", "squad size", "rolling subs"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-players",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-4-equipment",
    category: "referee_law",
    title: "Law 4 - Players' Equipment",
    summary: "Mandatory kit (shirt, shorts, socks, shinguards, footwear) and safety of equipment.",
    body:
      "Shinguards are compulsory at all levels, including grassroots youth football. Referees " +
      "must check that no player is wearing anything dangerous (jewellery, hard casts, etc.) " +
      "before kick-off.",
    tags: ["kit", "shinguards", "safety", "jewellery"],
    sourceUrl: "https://www.theifab.com/laws/latest/players-equipment",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-5-referee",
    category: "referee_law",
    title: "Law 5 - The Referee",
    summary: "The referee's authority, and the new 2025/26 'Captain Only' dissent protocol.",
    body:
      "The referee has full authority to enforce the Laws. New for 2025/26: a formal " +
      "'Captain Only' guideline lets a competition or referee restrict approaches about " +
      "decisions to the team captain, who is responsible for communicating respectfully and " +
      "directing team-mates away. This is being introduced across English football, including " +
      "grassroots, as part of a wider respect and behaviour drive.",
    tags: ["referee authority", "captain only", "dissent", "respect", "2025/26 change"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-referee",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-6-officials",
    category: "referee_law",
    title: "Law 6 - Other Match Officials",
    summary: "Assistant referees and fourth officials; rarely used below Step 5 grassroots.",
    body:
      "Defines the role of assistant referees, fourth officials and (at higher levels) VAR. " +
      "Most grassroots youth matches are run with a single referee and club-appointed " +
      "linespersons who assist with offside/ball-out-of-play calls only, without decision-making " +
      "authority.",
    tags: ["assistant referee", "linesperson", "officials"],
    sourceUrl: "https://www.theifab.com/laws/latest/other-match-officials",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-7-duration",
    category: "referee_law",
    title: "Law 7 - The Duration of the Match",
    summary: "Halves/quarters, half-time, and added time. Grassroots ages use shorter periods.",
    body:
      "Standard adult matches are two 45-minute halves. Grassroots youth football uses " +
      "shorter, age-appropriate periods (see FA Guidelines section), and younger age groups " +
      "(U7-U10) may play in quarters rather than halves at the league's discretion, often to " +
      "help rotate players and share game time more evenly.",
    tags: ["match duration", "halves", "quarters", "added time"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-duration-of-the-match",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-8-start-restart",
    category: "referee_law",
    title: "Law 8 - Start and Restart of Play",
    summary: "Kick-off, dropped ball and how play restarts after a stoppage.",
    body:
      "Covers the kick-off procedure at the start of each period and after a goal, plus how " +
      "play restarts with a dropped ball after an outside interference or injury stoppage.",
    tags: ["kick-off", "dropped ball", "restart"],
    sourceUrl: "https://www.theifab.com/laws/latest/start-and-restart-of-play",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-9-ball-in-out",
    category: "referee_law",
    title: "Law 9 - The Ball In and Out of Play",
    summary: "When the ball is out of play (goal line/touch line, whole ball over the whole line).",
    body:
      "The ball is out of play when it wholly crosses the goal line or touch line, whether on " +
      "the ground or in the air, or when play has been stopped by the referee.",
    tags: ["ball out of play", "touchline", "goal line"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-10-result",
    category: "referee_law",
    title: "Law 10 - Determining the Outcome of a Match",
    summary: "How goals are scored and match results determined, including penalty shoot-out procedure.",
    body:
      "A goal is scored when the whole ball passes over the goal line between the posts and " +
      "under the crossbar. Many grassroots youth leagues (especially U7-U12) do not record or " +
      "publish results/league tables to keep the focus on development rather than outcome — " +
      "check your league's policy.",
    tags: ["goals", "result", "penalty shoot-out", "no league tables"],
    sourceUrl: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-11-offside",
    category: "referee_law",
    title: "Law 11 - Offside",
    summary: "Offside position and offence; not applied in the youngest small-sided grassroots formats.",
    body:
      "A player is in an offside position if any playable part of the head, body or feet is " +
      "nearer to the opponents' goal line than both the ball and the second-last opponent, " +
      "when in the opponents' half. Many grassroots leagues do not apply offside at 5v5/7v7 " +
      "(U7-U10) to encourage attacking play and space exploration; it is typically introduced " +
      "from 9v9 (U11) onward — check local league rules.",
    tags: ["offside", "small-sided", "U11"],
    sourceUrl: "https://www.theifab.com/laws/latest/offside",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-12-fouls",
    category: "referee_law",
    title: "Law 12 - Fouls and Misconduct",
    summary: "Direct/indirect free kick offences, sin bins, and cautionable/sending-off offences.",
    body:
      "Defines fouls, cautions (yellow card) and dismissals (red card). For 2025/26, England " +
      "grassroots football (up to Step 5 and Tier 3 in the women's game) uses 10-minute " +
      "temporary dismissals ('sin bins') at the referee's discretion, principally for dissent: " +
      "the referee shows a yellow card and points to the sin bin area. A second caution while " +
      "in the sin bin, or after returning, results in a red card and permanent dismissal.",
    tags: ["fouls", "yellow card", "red card", "sin bin", "dissent", "2025/26 change"],
    sourceUrl: "https://www.theifab.com/laws/latest/fouls-and-misconduct",
    lastUpdated: "2025-08-21",
  },
  {
    id: "law-13-free-kicks",
    category: "referee_law",
    title: "Law 13 - Free Kicks",
    summary: "Direct vs indirect free kicks and the required distance for the defending wall.",
    body:
      "Direct free kicks may be scored straight into the opponents' goal; indirect free kicks " +
      "must touch another player before a goal can be scored. Opponents must retreat at least " +
      "the required distance (reduced for the youngest small-sided formats) before the kick is taken.",
    tags: ["free kicks", "wall distance"],
    sourceUrl: "https://www.theifab.com/laws/latest/free-kicks",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-14-penalty",
    category: "referee_law",
    title: "Law 14 - The Penalty Kick",
    summary: "Penalty kick procedure, including goalkeeper positioning requirements.",
    body:
      "Awarded for a direct free-kick offence committed by a defender inside their own penalty " +
      "area. The goalkeeper must have at least part of one foot on or in line with the goal " +
      "line and face the kicker when the kick is taken.",
    tags: ["penalty kick", "goalkeeper"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-penalty-kick",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-15-throw-in",
    category: "referee_law",
    title: "Law 15 - The Throw-In",
    summary: "Correct throw-in technique and the offence of a foul throw.",
    body:
      "Taken when the whole ball crosses the touch line. The thrower must face the field, " +
      "keep both feet on or behind the touch line (or on it), and use both hands, delivering " +
      "the ball from behind and over the head.",
    tags: ["throw-in", "foul throw"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-throw-in",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-16-goal-kick",
    category: "referee_law",
    title: "Law 16 - The Goal Kick",
    summary: "Goal kick procedure, including that the ball is in play once it is kicked and moves.",
    body:
      "Awarded when the whole ball crosses the goal line (not scored) last touched by an " +
      "attacker. Since a recent Law change, the ball is in play as soon as it is kicked, so " +
      "opponents no longer need to wait outside the penalty area for it to leave the area.",
    tags: ["goal kick"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-goal-kick",
    lastUpdated: "2025-07-01",
  },
  {
    id: "law-17-corner",
    category: "referee_law",
    title: "Law 17 - The Corner Kick",
    summary: "Corner kick procedure, and the 2025/26 corner-kick sanction for goalkeeper time-wasting.",
    body:
      "Awarded when the whole ball crosses the goal line (not scored) last touched by a " +
      "defender. New for 2025/26: if a goalkeeper holds the ball for longer than 8 seconds " +
      "(signalled by the referee with a visual 5-second countdown), the sanction is now a " +
      "corner kick to the opposing team, replacing the previous indirect free kick for holding " +
      "the ball more than 6 seconds.",
    tags: ["corner kick", "goalkeeper time-wasting", "2025/26 change"],
    sourceUrl: "https://www.theifab.com/laws/latest/the-corner-kick",
    lastUpdated: "2025-07-01",
  },
  {
    id: "ref-2025-26-headline-changes",
    category: "referee_law",
    title: "Headline Law changes for 2025/26",
    summary: "Goalkeeper 8-second time limit and the 'Captain Only' dissent protocol.",
    body:
      "The Laws of the Game 2025/26 edition took effect from 1 July 2025 (moved later than " +
      "the usual 1 June to give more preparation time). Two headline changes: (1) goalkeepers " +
      "may now hold the ball for up to 8 seconds (with a visible 5-second referee countdown) " +
      "before conceding a corner kick, up from a 6-second indirect free kick sanction; (2) a " +
      "'Captain Only' guideline allows competitions to limit in-game approaches to the referee " +
      "about decisions to team captains. England grassroots football has also rolled out wider " +
      "behaviour measures for 2025/26, including 10-minute sin bins for dissent at all " +
      "grassroots levels.",
    tags: ["2025/26 change", "goalkeeper", "captain only", "sin bin", "respect"],
    sourceUrl: "https://downloads.theifab.com/downloads/changes-to-the-laws-of-the-game-2025-26?l=en",
    lastUpdated: "2025-07-01",
  },
];
