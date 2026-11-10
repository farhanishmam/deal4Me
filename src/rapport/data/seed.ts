/**
 * Cross-screen demo content. Screen-only copy (calendar rows, transcripts,
 * memory answers) lives with its screen; anything two screens or two phones
 * must agree on lives here.
 */
import type { PersonaId, PersonId } from "./people";

/* ---------- Home: opportunities the agent found ---------- */

export interface Opportunity {
  personId: PersonId;
  topics: [string, string, string];
}

export const OPPORTUNITIES: Record<PersonaId, Opportunity[]> = {
  farhan: [
    {
      personId: "lena",
      topics: [
        "Randomization schedules for interfaces",
        "Measuring generalization gaps",
        "A joint evaluation on your benchmark",
      ],
    },
    {
      personId: "arun",
      topics: [
        "A shared benchmark for web agents",
        "Long-horizon evaluations at scale",
        "MCP tooling for agent runs",
      ],
    },
    {
      personId: "maya",
      topics: [
        "Evaluating agents on unseen websites",
        "Your long-horizon results",
        "A slot in her next session",
      ],
    },
  ],
  lena: [
    {
      personId: "farhan",
      topics: [
        "A benchmark that randomizes web design",
        "Measuring generalization gaps",
        "Your schedules on his web-agent benchmark",
      ],
    },
    {
      personId: "maya",
      topics: [
        "Sim-to-real lessons for agent evaluation",
        "Your panel answer on randomization",
        "A follow-up session in the spring",
      ],
    },
    {
      personId: "arun",
      topics: [
        "Simulation infrastructure at scale",
        "Shared configs for randomized runs",
        "Compute for large sweeps",
      ],
    },
  ],
};

/* ---------- Brief: why the viewer should connect ---------- */

export const SAID_TODAY: Record<PersonId, string> = {
  farhan: "Building a benchmark that randomizes web design choices",
  lena: "Wants to try randomization on user interfaces",
  arun: "The infrastructure exists; a shared benchmark is missing",
  maya: "Asked how web agents hold up on unseen sites",
};

export const WHY_CONNECT: Record<PersonaId, Partial<Record<PersonId, string>>> = {
  farhan: {
    lena: "Her randomization methods map onto your benchmark for web agents.",
    arun: "His infrastructure could run your benchmark at scale.",
    maya: "She is looking for exactly the evaluation you are building.",
  },
  lena: {
    farhan: "His benchmark is the interface testbed you have been looking for.",
    maya: "She wants sim-to-real lessons for evaluating web agents.",
    arun: "His team runs the kind of large randomized sweeps you need.",
  },
};

/* ---------- Agent-to-agent exchange (Farhan's agent <-> Lena's agent) ---------- */

export interface ExchangeMessage {
  /** Whose agent is speaking. */
  from: PersonaId;
  text: string;
  /** What this message revealed, shown under the bubble. */
  shared?: string;
}

export const EXCHANGE_SCRIPT: ExchangeMessage[] = [
  {
    from: "farhan",
    text: "I represent a researcher building a web-agent benchmark that randomizes UI design choices. Keen to compare notes.",
    shared: "role · current project",
  },
  {
    from: "lena",
    text: "Lena works on sim-to-real with heavy domain randomization and wants testbeds outside robotics.",
    shared: "focus areas · recent work",
  },
  {
    from: "farhan",
    text: "Overlap: randomization schedules and measuring generalization gaps. Open to a joint evaluation?",
  },
  {
    from: "lena",
    text: "Yes. She is free Wednesday 10–11 AM or Thursday 3–4 PM.",
    shared: "free/busy",
  },
  {
    from: "farhan",
    text: "Wednesday 10 AM works for him. I'll hold it as a coffee and draft a summary for both of them.",
    shared: "free/busy",
  },
  {
    from: "lena",
    text: "Confirmed on our side. Sending Lena the summary now.",
  },
];

/** Milliseconds between exchange messages. Both phones derive progress from the same clock. */
export const EXCHANGE_STEP_MS = 1800;

export type ShareKey = "role" | "cv" | "busy" | "project";

export const SHARE_OPTIONS: { key: ShareKey; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "cv", label: "CV highlights" },
  { key: "busy", label: "Free/busy" },
  { key: "project", label: "Current project" },
];

/* ---------- Match summary ---------- */

export interface MatchSummary {
  youShared: string;
  theyShared: string;
  opportunities: { title: string; detail: string }[];
  slot: { dow: string; date: string; title: string; note: string };
}

export const MATCH: Record<PersonaId, MatchSummary> = {
  farhan: {
    youShared: "Role, current benchmark, free/busy",
    theyShared: "Focus areas, recent work, free/busy",
    opportunities: [
      { title: "Joint evaluation", detail: "Run her randomization schedules on your web-agent benchmark" },
      { title: "Cross-domain paper", detail: "Generalization gaps in simulated vs. web environments" },
      { title: "Shared tooling", detail: "One config format for randomization across both setups" },
    ],
    slot: { dow: "WED", date: "11", title: "Coffee, 10:00 AM", note: "The slot both agents agreed on" },
  },
  lena: {
    youShared: "Focus areas, recent work, free/busy",
    theyShared: "Role, current benchmark, free/busy",
    opportunities: [
      { title: "Joint evaluation", detail: "Run your randomization schedules on his web-agent benchmark" },
      { title: "Cross-domain paper", detail: "Generalization gaps in simulated vs. web environments" },
      { title: "Shared tooling", detail: "One config format for randomization across both setups" },
    ],
    slot: { dow: "WED", date: "11", title: "Coffee, 10:00 AM", note: "The slot both agents agreed on" },
  },
};
