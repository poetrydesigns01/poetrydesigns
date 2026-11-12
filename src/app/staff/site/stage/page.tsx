import { Suspense } from "react";
import { StageForm } from "@/components/site/stage-form";

// Marking a stage's work done. The site comes from the address, so the form waits for it.
export default function SiteStagePage() {
  return (
    <Suspense>
      <StageForm />
    </Suspense>
  );
}
