"use client";

import { SamplePhoto } from "@/components/instruments/sample-photo";
import { useFirm } from "@/lib/demo-store";
import type { Post } from "@/lib/firm-data";
import { datePart, formatStampShort, formatTime } from "@/lib/format";
import { TODAY } from "@/lib/demo-data";
import { SealIcon } from "./icons";
import { colourOf, roleWords } from "./people";

// A single message in brief, for previews outside the chat (the client's home). The chat
// itself is in chat.tsx.

/** One post: who, when, the words and its first photos. */
export function ThreadPost({ post }: { post: Post; /** Kept for older callers; photos carry no tag now. */ firstPhoto?: boolean }) {
  const firm = useFirm();
  const person = firm.person(post.by);
  const when = datePart(post.at) === TODAY ? formatTime(post.at) : formatStampShort(post.at);

  if (post.kind !== "post") {
    return (
      <article className="glass-inner flex items-start gap-2 px-3 py-2.5">
        <SealIcon size={18} className="mt-0.5 flex-none text-kota" />
        <p className="text-15">
          {post.text} <time dateTime={post.at} className="text-13 whitespace-nowrap text-ink-soft">{when}</time>
        </p>
      </article>
    );
  }

  return (
    <article className="glass-inner grid gap-1.5 px-3 py-2.5">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-13">
        <span className="min-w-0 truncate">
          <span className="font-semibold" style={{ color: colourOf(post.by) }}>
            {person?.name ?? post.by}
          </span>
          {person && <span className="text-ink-soft"> · {roleWords(person)}</span>}
        </span>
        <time dateTime={post.at} className="text-ink-soft">
          {when}
        </time>
      </p>
      {post.text && <p className="text-15 whitespace-pre-wrap">{post.text}</p>}
      {post.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.photos.slice(0, 3).map((kind, i) => (
            <span key={`${kind}-${i}`} className="overflow-hidden rounded-xl">
              <SamplePhoto kind={kind} tag={false} />
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

/** Posts newest first, as brief cards. */
export function ThreadList({ posts, limit, empty = "No messages yet" }: { posts: Post[]; limit?: number; empty?: string }) {
  const shown = [...posts].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
  if (shown.length === 0) return <p className="py-4 text-15 text-ink-soft">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {shown.map((post) => (
        <li key={post.id}>
          <ThreadPost post={post} />
        </li>
      ))}
    </ul>
  );
}
