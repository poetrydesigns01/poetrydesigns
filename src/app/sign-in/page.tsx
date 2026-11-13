import { redirect } from "next/navigation";

// Signing in now happens on the first screen, so the old address opens it.
export default function SignInPage() {
  redirect("/");
}
