import type { RevisionView } from "@/lib/firm";
import type { Tone } from "@/lib/portal";

// A recommended change's state as a chip tone. Shared by the desk and the programme.

export function changeTone(status: RevisionView["status"]): Tone {
  if (status === "approved") return "done";
  if (status === "with-client") return "waiting";
  if (status === "changes-asked") return "progress";
  return "locked";
}
