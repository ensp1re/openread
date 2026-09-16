import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Literata } from "next/font/google";
import { PREFERENCES_BOOT_SCRIPT } from "@/lib/preferences";
import "./globals.css";

// Literata was drawn for long reading in Google Play Books; its optical-size axis adapts to the text size.
const literata = Literata({
  subsets: ["latin", "latin-ext", "cyrillic"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-literata",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
  display: "swap",
  preload: false,
  // next/font has no fallback metrics for this family; the system sans fallback is close enough.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "OpenRead", template: "%s · OpenRead" },
  description: "Paste an article link and read it in a calm, carefully typeset page. No account needed.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c1e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
