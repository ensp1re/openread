"use client";

import { ago } from "@/lib/time-ago";
import type { ResumeCardProps } from "@/types/reader";

/**
 * Offered when something half-read is opened again. Not a dialog: the page stays readable and
 * scrollable behind it, nothing is trapped, and reading on answers it as well as any button.
 */
export function ResumeCard({ offer, onContinue, onStartOver, onDismiss }: ResumeCardProps) {
  const meta = [`${offer.percent}% read`, offer.at ? ago(offer.at) : null].filter(Boolean).join(" · ");
  return (
    <section className="resume-card" aria-labelledby="resume-title">
      <div className="resume-body">
        <h2 id="resume-title" className="resume-title">
          Pick up where you left off?
        </h2>
        {offer.words && <p className="resume-words">{offer.words}</p>}
        <p className="resume-meta">{meta}</p>
      </div>
      <div className="resume-actions">
        <button type="button" className="primary-button" onClick={onContinue}>
          Continue reading
        </button>
        <button type="button" className="text-button" onClick={onStartOver}>
          {offer.inBook ? "Start of chapter" : "Start over"}
        </button>
      </div>
      <button type="button" className="resume-dismiss" aria-label="Not now" title="Not now (Esc)" onClick={onDismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </section>
  );
}
