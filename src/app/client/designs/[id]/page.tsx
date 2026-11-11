import { notFound } from "next/navigation";
import { Suspense } from "react";
import { designs } from "@/lib/demo-data";
import { DesignViewer } from "./design-viewer";

export function generateStaticParams() {
  return designs.map((design) => ({ id: design.id }));
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
  const design = designs.find((d) => d.id === id);
  if (!design) notFound();
  return <DesignViewer design={design} />;
}
