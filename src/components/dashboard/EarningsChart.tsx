"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";
import { useMounted } from "./hooks";
import type { EarningsPoint } from "./demo-series";

function ChartTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: EarningsPoint }[];
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lift">
      <p className="text-label text-muted-foreground">{point.label}</p>
      <p className="text-sm font-semibold tabular-nums">{money(point.cents)}</p>
    </div>
  );
}

type TickProps = {
  x?: number;
  y?: number;
  index?: number;
  visibleTicksCount?: number;
  payload?: { value: string };
};

/** First label sits flush left and the last flush right, so neither is cut off at the card edge. */
function Tick({
  x = 0,
  y = 0,
  index = 0,
  visibleTicksCount = 0,
  payload,
}: TickProps) {
  const anchor =
    index === 0 ? "start" : index === visibleTicksCount - 1 ? "end" : "middle";
  return (
    <text
      x={x}
      y={y + 14}
      fontSize={12}
      fill="var(--muted-foreground)"
      textAnchor={anchor}
    >
      {payload?.value}
    </text>
  );
}

export function EarningsChart({ points }: { points: EarningsPoint[] }) {
  // Recharts measures its container, so it only renders in the browser.
  const mounted = useMounted();
  const ticks = [0, 7, 14, 21, points.length - 1].map((i) => points[i].label);

  return (
    <div
      className="h-[220px] w-full lg:h-[290px]"
      role="img"
      aria-label="Earnings over the last 30 days"
    >
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="label"
              ticks={ticks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<Tick />}
              height={30}
            />
            <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.12)]} />
            <Tooltip
              content={<ChartTip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cents"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="var(--primary)"
              fillOpacity={0.06}
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--primary)",
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
