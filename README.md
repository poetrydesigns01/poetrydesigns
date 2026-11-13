# Poetry Designs portal

The client and project portal for Poetry Designs. This repository currently holds the **UI/UX demo**: a clickable walkthrough with sample data and no back end.

## Run it

Requires Node.js 20.9 or later.

```sh
npm install
npm run dev
```

Open http://localhost:3000 and sign in with one of the demo accounts below.

## Demo accounts

Each role's screens open by signing in on the first screen. These accounts are for the demo only: they are checked in the browser against a list in `src/lib/demo-accounts.ts`, so they are not real security. IDs are not case-sensitive and may be typed with `@poetrydesigns.in` after them; passwords are case-sensitive.

| ID | Password | Person | Role | Opens |
|---|---|---|---|---|
| `meera.iyer` | `Meera@2026` | Meera Iyer | Client (homeowner) | `/client` |
| `rohan.menon` | `Rohan@2026` | Rohan Menon | Business development | `/staff/bd` |
| `vikram.desai` | `Vikram@2026` | Vikram Desai | Senior architect, Project Head | `/staff/architect` |
| `ananya.rao` | `Ananya@2026` | Ananya Rao | Junior architect | `/staff/architect` |
| `suresh.gowda` | `Suresh@2026` | Suresh Gowda | Site engineer | `/staff/site` |
| `manjunath.k` | `Manjunath@2026` | Manjunath K | Junior site engineer | `/staff/site` |
| `prakash.hegde` | `Prakash@2026` | Prakash Hegde | Procurement lead | `/staff/finance` |
| `divya.shenoy` | `Divya@2026` | Divya Shenoy | Accountant | `/staff/finance` |
| `shalini.murthy` | `Shalini@2026` | Shalini Murthy | Operations head and admin | `/staff/admin` |

Every client and staff screen needs a signed-in session; without one it returns to the sign-in screen. "Sign out" is in each person's menu. The session lasts for the browser tab, and signing out keeps what was done in the demo.

## What the demo shows

| Person | Screens |
|---|---|
| Homeowner | Home (what is agreed, what is next, what a change costs), designs with a view-only viewer and approvals, payment milestones with demand letters, changes with price and delay, consultation hours |
| Site engineer | Material request form, built for a phone |
| Architect | Personal task sheet with hours logged |

Every name, address and amount is sample data. Decisions made in the demo are kept only for the browser tab; "Start the demo again" on the first page clears them.

## Notes

- Milestone names and percentages are placeholders until the real list for each project category is confirmed.
- "Download letter" opens the browser's print dialog. The real portal will generate the PDF on the server.
- Built with Next.js, React, TypeScript and Tailwind CSS.
