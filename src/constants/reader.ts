export const SHORTCUTS = [
  { keys: ["s"], label: "Reading settings" },
  { keys: ["t"], label: "Next theme" },
  { keys: ["+", "−"], label: "Larger / smaller text" },
  { keys: ["f"], label: "Focus mode" },
  { keys: ["j", "k"], label: "Scroll down / up" },
  { keys: ["n"], label: "Read another article" },
  { keys: ["?"], label: "Show shortcuts" },
  { keys: ["Esc"], label: "Close panel, leave focus mode" },
] as const;

/** Pixels of upward scroll before the hidden top bar comes back, so small corrections while rereading don't reveal it. */
export const BAR_REVEAL_SCROLL_UP_PX = 48;
/** The bar stays visible near the top of the page. */
export const BAR_ALWAYS_VISIBLE_ABOVE_PX = 120;
export const MAX_SAVED_POSITIONS = 100;
