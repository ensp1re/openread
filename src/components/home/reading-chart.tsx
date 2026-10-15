"use client";

import { useSyncExternalStore } from "react";
import { READING_CHART_DAYS } from "@/constants/library";
import { formatMinutes, minutesPerDay, readingLogStore } from "@/lib/reading-time";

const W = 240;
const H = 56;

/** Minutes read per day over the last 30 days, as one quiet line in the corner of the home page. */
export function ReadingChart() {
  const log = useSyncExternalStore(readingLogStore.subscribe, readingLogStore.get, readingLogStore.getServer);
  const days = minutesPerDay(log, READING_CHART_DAYS);
  const total = days.reduce((a, b) => a + b, 0);
  if (total < 1) return null;

  const max = Math.max(...days);
  const x = (i: number) => (i / (days.length - 1)) * W;
  // A little room at the top and bottom, so the line and the today dot are never cut off.
  const y = (m: number) => H - 3 - (m / max) * (H - 6);
  const points = days.map((m, i) => `${x(i).toFixed(1)},${y(m).toFixed(1)}`).join(" ");
  const today = days[days.length - 1];
  const first = new Date();
  first.setDate(first.getDate() - (READING_CHART_DAYS - 1));

  return (
    <section className="reading-stats" aria-labelledby="reading-stats-title">
      <h2 id="reading-stats-title">Reading, last {READING_CHART_DAYS} days</h2>
      <p className="reading-stats-total">{formatMinutes(total)}</p>
      <svg
        className="reading-stats-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Minutes read per day. Today ${formatMinutes(today)}; most in one day ${formatMinutes(max)}.`}
      >
        <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} className="reading-stats-base" />
        <polyline points={points} className="reading-stats-line" />
        <circle cx={x(days.length - 1)} cy={y(today)} r="2.5" className="reading-stats-dot" />
      </svg>
      <p className="reading-stats-axis" aria-hidden="true">
        <span>{first.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>Today</span>
      </p>
    </section>
  );
}
