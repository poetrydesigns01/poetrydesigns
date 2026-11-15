/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { designs } from "@/lib/demo-data";
import { seedDesignItems } from "@/lib/portal-data";
import { DesignViewer } from "./design-viewer";

/** Every design item of the client's project, and the older sheets other screens link to. */
const IDS = [...new Set([...seedDesignItems.filter((item) => item.projectId === "iyer").map((item) => item.id), ...designs.map((d) => d.id)])];

export function generateStaticParams() {
  return IDS.map((id) => ({ id }));
}

export default function DesignPage({ params }: PageProps<"/client/designs/[id]">) {
  return (
    <Suspense>
      <DesignFromParams params={params} />
    </Suspense>
  );
}

async function DesignFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IDS.includes(id)) notFound();
  return <DesignViewer id={id} />;
}
