"use client";

import { viewerIdOf } from "@/components/register/project-switch";
import { useStaffRole } from "@/components/register/staff-shell";
import { Composer, ThreadList } from "@/components/thread/thread";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";

// The project thread, newest first, and the box to post to it. A post from the team is
// emailed to the client; the client's own posts send no email.

export function ProjectUpdates({ projectId }: { projectId: ProjectId }) {
  const demo = useDemo();
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const by = viewerIdOf(role, demo.viewers);
  const posts = firm.posts.filter((post) => post.projectId === projectId);
  const clients = p.clientWord === "Meera" ? "Meera Iyer" : p.clients.join(" and ");

  return (
    <div className="grid max-w-[44rem] gap-10">
      <section aria-label="Write to the team and the client" className="grid gap-3">
        <h2 className="register-title">Post to the thread</h2>
        <Composer
          projectId={projectId}
          by={by}
          label="Write to the team and the client"
          photos
          note={`The client, ${clients}, is emailed.`}
        />
      </section>
      <section aria-label="The thread" className="grid gap-3">
        <h2 className="register-title">The thread</h2>
        <ThreadList posts={posts} empty="Nothing has been posted on this project yet." />
      </section>
    </div>
  );
}
