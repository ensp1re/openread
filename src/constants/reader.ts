export const SHORTCUTS = [
  { keys: ["s"], label: "Reading settings" },
  { keys: ["t"], label: "Next theme" },
  { keys: ["+", "−"], label: "Larger / smaller text" },
  { keys: ["f"], label: "Focus mode" },
  { keys: ["j", "k"], label: "Scroll down / up" },
  { keys: ["n"], label: "Read another article" },
  { keys: ["?"], label: "Show shortcuts" },
  { keys: ["Esc"], label: "Close panel or prompt, leave focus mode" },
] as const;

/** Pixels of upward scroll before the hidden top bar comes back, so small corrections while rereading don't reveal it. */
export const BAR_REVEAL_SCROLL_UP_PX = 48;
/** The bar stays visible near the top of the page. */
export const BAR_ALWAYS_VISIBLE_ABOVE_PX = 120;
export const MAX_SAVED_POSITIONS = 100;

/**
 * A reader appearing at the address Back or Forward went to, within this long, is a return, not a new
 * open: no question. Long enough for a big file that has to be read again from storage.
 */
export const HISTORY_RETURN_MS = 30_000;
/** A place is worth offering between these fractions; before, it's the start; after, it's finished. */
export const RESUME_RANGE = { MIN: 0.02, MAX: 0.98 } as const;
/** Where the eye rests, as a share of the window height: the saved block is the one starting above it. */
export const READING_LINE = 0.25;
/** How long the paragraph that was returned to stays marked. */
export const RESUME_MARK_MS = 2500;
