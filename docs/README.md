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
- [x] AI check: 21 of 21 answered cases passed (case 19 still to run; see
      [06-ai-design.md](06-ai-design.md))
- [x] MongoDB Atlas cluster and user created, connection string in `server/.env`
- [x] IP allowed in MongoDB Atlas. Connection, write, read and delete all tested. If your
      internet IP changes and it stops connecting, add the new IP in Security > Network Access.
- [ ] Check the **prices** with local technicians and the **safety tips** with Fire Service
      guidance (see [01-data-lists.md](01-data-lists.md)).

### Later (before the first commit)

- [ ] Create the GitHub repository, push, and set up `main` and `dev` branches.
- [ ] Add GitHub Actions to run `npm run check` on every push.
- [ ] Create the GitHub Projects task board for M3–M9.
- [ ] Vercel and Render accounts (only needed in December, for putting the site online).
