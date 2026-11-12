import { StaffShell } from "@/components/register/staff-shell";

// Every staff screen sits in the same frame: the rail (a tab bar on a phone), the person
// and project switches, and the one pause before anything is recorded.
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <StaffShell>{children}</StaffShell>;
}
