import Form from "next/form";
import Link from "next/link";
import { SampleTag } from "@/components/register/sample-tag";

// The sign-in screen, front end only. Nothing typed here is checked, kept or sent: the
// fields have no names, so submitting carries nothing, and it simply opens the person picker.

const input =
  "block min-h-12 w-full rounded-[3px] border-0 bg-lime px-3 text-17 text-ink placeholder:text-ink-soft";

export default function SignInPage() {
  return (
    <main className="on-dark flex flex-1 flex-col bg-rosewood text-lime">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-5 sm:px-8 sm:pt-10">
        <Link href="/" className="display inline-flex min-h-11 items-center text-22 leading-none">
          Poetry Designs
        </Link>
        <h1 className="display mt-8 text-32 sm:mt-14">Sign in</h1>

        <Form action="/" className="mt-6 grid gap-5" autoComplete="off">
          <div>
            <label htmlFor="sign-in-email" className="block text-17 font-semibold">
              Email
            </label>
            <input id="sign-in-email" type="email" inputMode="email" className={`${input} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="sign-in-password" className="block text-17 font-semibold">
              Password
            </label>
            <input id="sign-in-password" type="password" className={`${input} mt-1.5`} />
          </div>
          <button type="submit" className="btn btn-primary mt-1 w-full sm:w-auto sm:justify-self-start">
            Sign in
          </button>
        </Form>

        <details className="mt-4 text-17">
          <summary className="link inline-flex min-h-11 cursor-pointer items-center text-lime/80 hover:text-lime">
            Forgot your password
          </summary>
          <p className="mt-1 max-w-[40ch] text-lime/80">
            In the portal you get an email with a link to set a new one. This demo sends no email.
          </p>
        </details>

        <p className="mt-8 text-17 text-lime/80">
          <SampleTag>Demo only</SampleTag> Nothing is checked. Signing in takes you to the person picker.
        </p>
      </div>
    </main>
  );
}
