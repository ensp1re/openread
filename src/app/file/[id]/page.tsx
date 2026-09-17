import type { Metadata } from "next";
import { StoredItemView } from "@/components/stored-item-view";
import type { FilePageProps } from "@/types/pages";

export const metadata: Metadata = { title: "Reading", robots: { index: false } };

export default async function FilePage({ params }: FilePageProps) {
  const { id } = await params;
  return <StoredItemView id={id} />;
}
