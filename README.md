# Poetry Designs portal

The client and project portal for Poetry Designs. This repository currently holds the **UI/UX demo**: a clickable walkthrough with sample data and no back end.

## Run it

Requires Node.js 20.9 or later.

```sh
npm install
npm run dev
```

Open http://localhost:3000 and pick a person.

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
