import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ProjectFrame } from "@/components/project/project-frame";
import { projects, type ProjectId } from "@/lib/firm-data";

// The project record: one board for the project, then its tabs. Every staff role opens it;
// the tabs follow what each role may see.

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export default function ProjectLayout({ children, params }: LayoutProps<"/staff/projects/[id]">) {
  return (
    <Suspense>
      <FrameFromParams params={params}>{children}</FrameFromParams>
    </Suspense>
  );
}

async function FrameFromParams({ params, children }: { params: Promise<{ id: string }>; children: ReactNode }) {
  const { id } = await params;
  if (!projects.some((p) => p.id === id)) notFound();
  return <ProjectFrame projectId={id as ProjectId}>{children}</ProjectFrame>;
}
