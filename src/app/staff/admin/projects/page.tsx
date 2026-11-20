/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { ProfitTable } from "@/components/admin/profit-table";
import { ProjectTiles } from "@/components/admin/project-tiles";

// Every project as a picture tile, then the profit view: margin so far and cash, before GST.
export default function AdminProjectsPage() {
  return (
    <ProfitTable>
      <ProjectTiles />
    </ProfitTable>
  );
}
