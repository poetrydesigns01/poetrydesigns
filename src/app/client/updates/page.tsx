"use client";

import { Chat } from "@/components/thread/chat";
import { ACCOUNTS } from "@/lib/demo-accounts";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";

// The client's update log: one chat with the team about Iyer Residence.

export default function UpdatesPage() {
  const demo = useDemo();
  const firm = useFirm();
  const account = ACCOUNTS.find((a) => a.id === demo.session?.id && a.role === "client");
  const viewer: PersonId = account?.person ?? "meera";
  const title = firm.project("iyer")?.name ?? "Iyer Residence";

  return (
    <div className="chat-page mx-auto w-full max-w-4xl px-3 pt-3 sm:px-6 lg:py-6">
      <Chat projectId="iyer" viewer={viewer} title={title} heading="h1" fill="client" />
    </div>
  );
}
