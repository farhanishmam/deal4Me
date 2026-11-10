import { BRAND } from "@/lib/brand";
import type { ThemeId } from "./themes";

const A = { fill: "var(--brand-a)" } as const;
const B = { fill: "var(--brand-b)" } as const;
const lineA = { stroke: "var(--brand-a)", fill: "none" } as const;
const lineB = { stroke: "var(--brand-b)", fill: "none" } as const;
const lineC = { stroke: "var(--brand-c)", fill: "none" } as const;

// One tree, drawn on a 22 x 30 grid. Tiers step out, then the trunk.
const TREE = "M11 3 L16 11 H14 L18.5 18 H16 L21 25 H12.2 V29 H9.8 V25 H1 L6 18 H3.5 L8 11 H6 Z";

/** Each theme's own mark: pine trees, a mountain line, a sun over a ridge. */
function Mark({ id, size }: { id: ThemeId; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      {id === "pine" && (
        <>
          <path d={TREE} transform="translate(16.6 10.2) scale(.68)" style={B} />
          <path d={TREE} transform="translate(.4 0)" style={A} />
        </>
      )}
      {id === "sky" && (
        <>
          <path
            d="M2.5 27 L9 18 L13.2 23.2 L18 17 L23 23 L29.5 27"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={lineB}
          />
          <path
            d="M2.5 22 L11 8.5 L16.2 16.4 L19.4 12 L29.5 22"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={lineA}
          />
        </>
      )}
      {id === "golden" && (
        <>
          <path d="M9.4 20 a6.6 6.6 0 0 1 13.2 0 Z" style={A} />
          <g strokeWidth="2" strokeLinecap="round" style={lineB}>
            <path d="M16 8.2 V5" />
            <path d="M7.6 11.6 L5.4 9.4" />
            <path d="M24.4 11.6 L26.6 9.4" />
            <path d="M4.4 17.4 H2" />
            <path d="M27.6 17.4 H30" />
          </g>
          <path
            d="M2 25.5 C5.5 21.8 9 21.8 12 24.2 S18.5 26.8 22 23.6 S27.5 22.4 30 25"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={lineC}
          />
        </>
      )}
    </svg>
  );
}

/** Mark beside the wordmark. The name always comes from BRAND. */
export function ThemeLogo({ id, className = "" }: { id: ThemeId; className?: string }) {
  return (
    <span role="img" className={`inline-flex items-center gap-2.5 ${className}`} aria-label={BRAND.name}>
      <Mark id={id} size={32} />
      <span className="signin-wordmark text-[22px] leading-none tracking-[-0.02em] whitespace-nowrap" style={{ color: "var(--on)" }}>
        <span className="font-bold">{BRAND.wordmark.strong}</span>{" "}
        <span className="font-normal signin-on-muted">{BRAND.wordmark.light}</span>
      </span>
    </span>
  );
}
