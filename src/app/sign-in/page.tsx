/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { redirect } from "next/navigation";

// Signing in now happens on the first screen, so the old address opens it.
export default function SignInPage() {
  redirect("/");
}
