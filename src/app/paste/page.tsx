import type { Metadata } from "next";
import { Suspense } from "react";
import { PasteReader } from "@/components/paste-reader";

export const metadata: Metadata = { title: "Paste text" };

export default function PastePage() {
  return (
    <Suspense>
      <PasteReader />
    </Suspense>
  );
}
