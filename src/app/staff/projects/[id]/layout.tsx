/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { MISSING_TITLE, SITE_NAME } from "@/app/shared-metadata";
import { ProjectFrame } from "@/components/project/project-frame";
import { projects } from "@/lib/firm-data";
import { projectIdOf } from "./project-id";

// The project record: one board for the project, then its tabs. Every staff role opens it;
// the tabs follow what each role may see.

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

// The overview is named after the project; each tab after the project and the tab itself,
// "Iyer Residence · Programme". An unknown project is a missing page, tabs and all.
export async function generateMetadata({ params }: LayoutProps<"/staff/projects/[id]">): Promise<Metadata> {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  if (!project) return { title: MISSING_TITLE };
  return {
    title: {
      default: project.name,
      template: `${project.name} · %s · ${SITE_NAME}`,
    },
  };
}

export default function ProjectLayout({ children, params }: LayoutProps<"/staff/projects/[id]">) {
  return (
    <Suspense>
      <FrameFromParams params={params}>{children}</FrameFromParams>
    </Suspense>
  );
}

async function FrameFromParams({ params, children }: { params: Promise<{ id: string }>; children: ReactNode }) {
  const projectId = projectIdOf((await params).id);
  // An unknown project: the tab page under it shows the missing page (see project-id.ts).
  if (!projectId) return children;
  return <ProjectFrame projectId={projectId}>{children}</ProjectFrame>;
}
