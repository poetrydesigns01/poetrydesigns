/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { OPEN_GRAPH, SOCIAL_IMAGE } from "@/app/shared-metadata";
import { Brand } from "@/components/brand";
import { HomeLink } from "@/components/home-link";

// The privacy policy: public, readable without signing in, and the one page in the portal
// where long text is right. It is written under India's Digital Personal Data Protection Act,
// 2023, and says plainly what holds in the preview today and what the portal is for once it
// runs real projects. Poetry's own details live in FIRM and nowhere else.

type FirmContact = {
  name: string;
  office: string;
  /** A designation or a name: whoever answers privacy questions and complaints. */
  grievanceOfficer: string;
  /** A monitored mailbox, for example privacy@ on the firm's domain. */
  email?: string;
  /** A working number, as dialled from India, for example "+91 80 1234 5678". */
  phone?: string;
};

/**
 * Poetry's details for privacy questions. Correct them here: the page reads only this. The
 * email and phone stay unset until Poetry confirms real ones; each shows as a row once it is
 * set. Never put the portal's sample numbers here.
 */
const FIRM: FirmContact = {
  name: "Poetry Designs",
  office: "Bengaluru, Karnataka, India",
  grievanceOfficer: "the Director",
};

const UPDATED = "17 November 2026";

const DESCRIPTION =
  "What the Poetry Designs portal keeps about you, why, who can see it, how long it is kept, and your rights under India's DPDP Act, 2023.";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    ...OPEN_GRAPH,
    title: `Privacy policy · ${FIRM.name}`,
    description: DESCRIPTION,
    url: "/privacy",
    images: [SOCIAL_IMAGE],
  },
};

const SECTIONS = [
  { id: "who-we-are", title: "Who we are" },
  { id: "what-we-collect", title: "What we collect" },
  { id: "why-we-use-it", title: "Why we use it" },
  { id: "who-can-see-it", title: "Who can see it" },
  { id: "how-long-we-keep-it", title: "How long we keep it" },
  { id: "how-we-protect-it", title: "How we protect it" },
  { id: "your-rights", title: "Your rights" },
  { id: "cookies-and-storage", title: "Cookies and storage" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact and grievances" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function PrivacyPage() {
  return (
    <main className="glass-world flex min-h-svh flex-1 flex-col text-ink">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5 sm:px-8 sm:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <Brand />
          </Link>
          {/* On a phone the brand and the link at the foot lead back; the button would wrap under the brand. */}
          <div className="hidden sm:block">
            <HomeLink className="btn btn-glass min-h-11 px-4 text-15">Back to the portal</HomeLink>
          </div>
        </header>

        <div className="mt-6 grid items-start gap-6 sm:mt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
          <nav aria-label="On this page" className="glass sticky top-6 hidden p-4 lg:block">
            <p className="lettering px-2 text-ink-soft">On this page</p>
            <Contents className="mt-2" />
          </nav>

          <article className="glass-strong min-w-0 p-5 sm:p-10">
            <header>
              <h1 className="display display-lg">Privacy policy</h1>
              <p className="lettering mt-3 text-ink-soft">Last updated {UPDATED}</p>
              <p className="mt-6 max-w-[66ch] text-17">
                This policy explains what the {FIRM.name} portal keeps about you, why we keep it, who can see
                it, and what you can ask us to do with it. It covers the portal only: the screens our clients and
                our team use to follow a home from the first drawing to the day it is handed over.
              </p>
              <div className="glass-inner mt-6 max-w-[66ch] p-4 sm:p-5">
                <p className="text-15 font-semibold">The portal is in preview</p>
                <p className="mt-1 text-15">
                  Its projects are samples and it holds no real client data. What you do in it stays in your browser
                  tab, apart from signing in. Where this policy says what we keep, it describes the portal once it runs
                  real projects.
                </p>
              </div>
            </header>

            <details className="group glass-inner mt-6 lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-15 font-semibold [&::-webkit-details-marker]:hidden">
                On this page
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 flex-none transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <nav aria-label="On this page" className="px-2 pb-3">
                <Contents />
              </nav>
            </details>

            <Section id="who-we-are">
              <P>
                {FIRM.name} designs and builds homes in Bengaluru. We run this portal for our clients and our team,
                and we decide what it keeps and why. Under India&rsquo;s Digital Personal Data Protection Act, 2023,
                that makes us the Data Fiduciary for the personal data in it.
              </P>
              <FirmDetails />
            </Section>

            <Section id="what-we-collect">
              <P>Only what it takes to design, build and pay for a home, and to run the team that builds it.</P>
              <Terms
                rows={[
                  [
                    "Signing in",
                    "Your portal ID and password. They go over HTTPS to our server, which checks them and keeps neither.",
                  ],
                  ["About you", "Your name, phone number and email address, and your part in the project."],
                  ["Your property", "Its address, with the layout and plot number, and where it is on the map."],
                  [
                    "The agreement",
                    "The signed agreement, estimates and changes to the price, and the payment schedule you approve.",
                  ],
                  [
                    "Payments",
                    "Demand letters for each instalment, and the payments we receive, with their bank reference (UTR) numbers.",
                  ],
                  [
                    "Designs and approvals",
                    "The drawings and specifications we share with you, and each approval or request for a change, with your name, the date and the time.",
                  ],
                  ["The project chat", "Messages and photos posted in your project’s updates, including photos taken on site."],
                  [
                    "For our team",
                    "Tasks given and done, hours logged, material requests raised, and the record of work on each project.",
                  ],
                ]}
              />
              <P>
                In the preview, only your ID and password leave your browser. Everything else is sample data, and
                anything you add stays in your tab. We do not use the portal to collect anything else about you.
              </P>
            </Section>

            <Section id="why-we-use-it">
              <List
                items={[
                  "To design and build your home: to share drawings, take your decisions, and plan and record the work on site.",
                  "To bill and receive payments: a demand letter for each instalment, and a record of what was paid and when.",
                  "To keep a record both sides can rely on: each approval is kept with who gave it and when, as your agreement says.",
                  "To run our team: to give out work, order material and follow how each project is going.",
                  "To meet the law: tax, accounting and building rules require us to keep some of these records.",
                ]}
              />
              <P>We use your data for these purposes only. We do not sell it, rent it out or use it for advertising.</P>
            </Section>

            <Section id="who-can-see-it">
              <List
                items={[
                  "Your project team at Poetry Designs, each seeing what their role needs: architects work on the designs, site engineers on the work and material for their sites, procurement and finance on payments and bills, and our admin on the whole record.",
                  "Once the portal runs real projects, each client sees their own project and never another client’s.",
                  "Our hosting provider, Vercel, stores and serves the portal for us. Its servers may be outside India.",
                  "Government bodies and courts, when the law requires us to share something.",
                ]}
              />
              <P>
                The portal has links to Google Maps for a project&rsquo;s site. A map opens only when you tap the link,
                and Google&rsquo;s own policy applies there. A phone number you tap opens your phone&rsquo;s dialler.
              </P>
            </Section>

            <Section id="how-long-we-keep-it">
              <Terms
                rows={[
                  [
                    "Your project record",
                    "The agreement, approvals, drawings, letters, payments and the project chat: while the project runs, and after handover for as long as we stand behind the work or the law requires us to keep them.",
                  ],
                  ["Accounts and tax", "Payments, letters and bills: for as long as Indian tax and accounting law requires."],
                  [
                    "Our team’s records",
                    "While a person works with us, and afterwards for as long as employment and tax law requires.",
                  ],
                  ["Signing in", "Not kept. The server checks your ID and password, answers, and keeps neither."],
                  ["In your browser", "As long as the tab’s session lasts. See Cookies and storage below."],
                ]}
              />
              <P>When none of these applies any more, we delete the data, or remove everything in it that identifies you.</P>
            </Section>

            <Section id="how-we-protect-it">
              <List
                items={[
                  "The portal is served over HTTPS only.",
                  "Passwords are checked on our server, so the portal never sends them to a browser, and yours is not kept with your session.",
                  "Your project’s screens are meant for the people on your project, each seeing what their role needs.",
                  "Drawings, specifications and your agreement open view only, with the viewer’s name and the date across them.",
                  "Approvals are kept as a record that is only added to: a correction is a new, dated entry, and the original stays.",
                ]}
              />
              <P>
                In the preview, signing in only chooses which sample screens a tab shows. It is not access control yet,
                which is why the preview holds no real client data.
              </P>
              <P>
                No system is perfectly safe, so keep your sign-in details to yourself and sign out on a shared device. If
                a breach ever affects your data, we will tell you and the Data Protection Board of India, as the Act
                requires.
              </P>
            </Section>

            <Section id="your-rights">
              <P>Under the Digital Personal Data Protection Act, 2023, you can:</P>
              <List
                items={[
                  "Ask for a summary of the personal data we hold about you, what we do with it, and who we have shared it with.",
                  "Ask us to correct, complete or update it.",
                  "Ask us to erase it, once we no longer need it and no law requires us to keep it. Approvals already given stay in the record: we can add a dated correction, but we cannot remove the record of what was agreed.",
                  "Withdraw your consent at any time, as easily as you gave it. This does not undo what was done before, and we may then be unable to keep running your project in the portal.",
                  "Nominate someone to use these rights for you if you die or cannot act yourself.",
                  "Have a complaint heard by us first, and, if our answer does not settle it, by the Data Protection Board of India.",
                ]}
              />
              <P>
                To use any of these rights, contact us as shown under{" "}
                <a href="#contact" className="link">
                  Contact and grievances
                </a>
                . We may ask you to confirm who you are before we act on a request.
              </P>
            </Section>

            <Section id="cookies-and-storage">
              <P>The portal sets no cookies.</P>
              <P>
                It keeps a small record in your browser&rsquo;s session storage for that tab: who is signed in, and what
                has been done during the visit, so each screen can show it. It lasts as long as the tab&rsquo;s session,
                which your browser may bring back if you reopen the tab. Signing out ends the sign-in and leaves the rest
                of the record with the tab. Signing in also sets a one-off marker that the next screen removes.
              </P>
              <P>Signing in sends your ID and password to our server to be checked. Nothing is kept.</P>
              <P>
                This is needed for the portal to work, so there is nothing to accept. We use no advertising or analytics
                cookies and no tracking of any kind. Our hosting provider keeps standard technical logs, such as IP
                addresses and the times of requests, to run and protect the service.
              </P>
            </Section>

            <Section id="children">
              <P>
                The portal is for homeowners and our team. It is not meant for anyone under 18, and we do not knowingly
                collect a child&rsquo;s personal data. If you think we hold some, tell us and we will remove it.
              </P>
            </Section>

            <Section id="changes">
              <P>
                We update this page when the portal or the law changes, and the date at the top shows when it last
                changed. If a change affects how we use your data, we will tell you in the portal before it takes effect.
              </P>
            </Section>

            <Section id="contact">
              <P>
                Questions, requests and complaints about your personal data go to our grievance officer,{" "}
                {FIRM.grievanceOfficer} of {FIRM.name}. Clients can also raise them with their point of contact in the
                portal.
              </P>
              <FirmDetails grievance />
              <P>
                We will confirm that we have your request and answer it promptly, within the time the law allows. If our
                answer does not settle it, you can complain to the Data Protection Board of India.
              </P>
            </Section>
          </article>
        </div>

        <p className="mt-8 text-15">
          <HomeLink className="link inline-flex min-h-11 items-center">Back to the portal</HomeLink>
        </p>
      </div>
    </main>
  );
}

function Contents({ className = "" }: { className?: string }) {
  return (
    <ol className={`grid ${className}`}>
      {SECTIONS.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex min-h-10 items-center rounded-lg px-2 text-15 text-ink hover:bg-white/55 focus-visible:bg-white/55"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)?.title;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-10 scroll-mt-6 border-t border-ink/10 pt-8">
      <h2 id={`${id}-title`} className="display text-22">
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[66ch] text-17">{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 grid max-w-[66ch] gap-3">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-x-2 text-17">
          <span className="mt-[0.68em] h-1.5 w-1.5 rounded-full bg-laterite" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Terms({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-4 grid max-w-[66ch] gap-4 sm:gap-3">
      {rows.map(([term, detail]) => (
        <div key={term} className="grid gap-x-6 gap-y-0.5 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
          <dt className="text-15 font-semibold sm:pt-0.5">{term}</dt>
          <dd className="text-17">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function FirmDetails({ grievance = false }: { grievance?: boolean }) {
  const officer = FIRM.grievanceOfficer.charAt(0).toUpperCase() + FIRM.grievanceOfficer.slice(1);
  const rows: [string, ReactNode][] = [
    grievance ? ["Grievance officer", `${officer}, ${FIRM.name}`] : ["Name", FIRM.name],
    ["Office", FIRM.office],
  ];
  if (FIRM.email) {
    rows.push([
      "Email",
      <a key="email" href={`mailto:${FIRM.email}`} className="link break-all">
        {FIRM.email}
      </a>,
    ]);
  }
  if (FIRM.phone) {
    rows.push([
      "Phone",
      <a key="phone" href={`tel:${FIRM.phone.replace(/[^+\d]/g, "")}`} className="link whitespace-nowrap">
        {FIRM.phone}
      </a>,
    ]);
  }
  // On a phone each label sits over its value, so the number and the address keep their lines.
  return (
    <dl className="glass-inner mt-5 grid max-w-md gap-3 p-4 sm:gap-2">
      {rows.map(([term, detail]) => (
        <div key={term} className="grid items-baseline gap-x-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <dt className="lettering text-ink-soft">{term}</dt>
          <dd className="text-17">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
