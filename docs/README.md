# Karigor: Planning Documents

Read these before coding. They follow the approved proposal.

| File                                           | What it covers                                              |
| ---------------------------------------------- | ----------------------------------------------------------- |
| [01-data-lists.md](01-data-lists.md)           | Services, skills, price list, safety tips, Dhaka areas      |
| [02-database-design.md](02-database-design.md) | MongoDB collections, fields and how they connect            |
| [03-booking-flow.md](03-booking-flow.md)       | Booking statuses and who can change them                    |
| [04-pages.md](04-pages.md)                     | All 15 pages and sketches of the main screens               |
| [05-api.md](05-api.md)                         | Every API endpoint and live (Socket.IO) event               |
| [06-ai-design.md](06-ai-design.md)             | How the AI check works, what it returns, and how to test it |
| [07-design.md](07-design.md)                   | Colors, fonts, shapes, ready-made components and wording    |
| [08-manual-testing.md](08-manual-testing.md)   | Manual test checklist for every page and role, and bugs     |
| [postman/](postman/)                           | Postman collection to try every endpoint (see 05-api.md)    |

## Clickable prototype

[prototype/index.html](prototype/index.html) shows all 15 pages (plus 8 important states such as
an emergency, a booking pop-up and a reject reason) in web and mobile view. Open it in a browser:
the list on the left jumps to any screen and the Desktop / Mobile switch changes the layout. Use
it as the design for pages that are not built yet. Live copy:
<https://sihab297.github.io/karigor-prototype/>

## Before-coding checklist

### Done

- [x] Data lists (services, skills, price list, safety tips, areas)
- [x] Database design
- [x] Booking status flow
- [x] Page list and sketches
- [x] API list
- [x] AI prompt, answer format and test script
- [x] Project setup: React + Vite + Tailwind, Express, TypeScript, ESLint, Prettier, tests

### You need to do

- [x] Gemini API key in `server/.env` (works)
- [x] Cloudinary account in `server/.env` (works)
- [x] AI check: all 22 cases passed with Claude, case 19 included (see
      [06-ai-design.md](06-ai-design.md))
- [x] MongoDB Atlas cluster and user created, connection string in `server/.env`
- [x] IP allowed in MongoDB Atlas. Connection, write, read and delete all tested. If your
      internet IP changes and it stops connecting, add the new IP in Security > Network Access.
- [ ] Check the **prices** with local technicians and the **safety tips** with Fire Service
      guidance (see [01-data-lists.md](01-data-lists.md)).

### Project setup

- [x] GitHub repository with `main` and `dev` branches. Features go to `dev` through pull
      requests.
- [x] GitHub Actions runs `npm run check` and the build on every push and pull request.
- [x] Issues grouped into milestones M3–M9 (used as the task board).
- [ ] Vercel and Render accounts (only needed in December, for putting the site online).
