/**
 * Everyone in the demo. Two of them own a phone on the /demo stage:
 * Farhan (left phone) and Lena (right phone). Every screen renders from the
 * point of view of the phone owner ("persona") read from the URL.
 */

export type PersonaId = "farhan" | "lena";
export type PersonId = PersonaId | "arun" | "maya";
export type Tone = "gold" | "steel" | "sage" | "lilac";

export interface Person {
  id: PersonId;
  name: string;
  first: string;
  initials: string;
  /** Avatar colour family. */
  tone: Tone;
  /** One line under the name on cards. */
  role: string;
  /** Public facts an agent can find (used by the research brief). */
  pub: {
    role: string;
    focus: string;
    recent: string;
    sources: string[];
  };
}

export const PEOPLE: Record<PersonId, Person> = {
  farhan: {
    id: "farhan",
    name: "Farhan Ishmam",
    first: "Farhan",
    initials: "FI",
    tone: "gold",
    role: "Researcher · Web agents",
    pub: {
      role: "Researcher, web agents",
      focus: "Long-horizon web agents and MCP tooling",
      recent: "Benchmarks for agents on unseen websites",
      sources: ["Personal site", "Scholar profile", "Your transcripts"],
    },
  },
  lena: {
    id: "lena",
    name: "Lena Okafor",
    first: "Lena",
    initials: "LO",
    tone: "steel",
    role: "Research scientist · Robot learning",
    pub: {
      role: "Research scientist, robot learning",
      focus: "Sim-to-real transfer and domain randomization",
      recent: "Papers on randomized simulation for manipulation",
      sources: ["Lab page", "Scholar profile", "Your transcripts"],
    },
  },
  arun: {
    id: "arun",
    name: "Arun Patel",
    first: "Arun",
    initials: "AP",
    tone: "lilac",
    role: "Agent infrastructure · Panelist today",
    pub: {
      role: "Engineering lead, agent infrastructure",
      focus: "Running long-horizon agent evaluations at scale",
      recent: "Open-source MCP tooling for agent runs",
      sources: ["Company blog", "GitHub", "Your transcripts"],
    },
  },
  maya: {
    id: "maya",
    name: "Maya Chen",
    first: "Maya",
    initials: "MC",
    tone: "sage",
    role: "Panel moderator · Agent evaluation",
    pub: {
      role: "Research lead, agent evaluation",
      focus: "Evaluating agents on unseen websites",
      recent: "Moderated today's Agents in the Wild panel",
      sources: ["Conference program", "Scholar profile", "Your transcripts"],
    },
  },
};

export const PERSONAS: PersonaId[] = ["farhan", "lena"];

export function isPersona(id: string): id is PersonaId {
  return id === "farhan" || id === "lena";
}

export function isPerson(id: string): id is PersonId {
  return id in PEOPLE;
}

/** The other phone owner. */
export function counterpart(persona: PersonaId): PersonaId {
  return persona === "farhan" ? "lena" : "farhan";
}

/** CSS colours for a tone, for avatars and tinted chips. */
export function toneVars(tone: Tone) {
  return {
    fg: `var(--rp-${tone})`,
    bg: `var(--rp-${tone}-bg)`,
    line: `var(--rp-${tone}-line)`,
  };
}
