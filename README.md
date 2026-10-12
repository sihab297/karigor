# Karigor (কারিগর)

An AI-based website that connects homeowners and tenants in Dhaka with trusted local technicians.
Customers describe a problem in Bangla, English or Banglish (or add a photo). The AI finds the right
service, urgency and a fair price range, shows safety tips in emergencies, and Smart Matching
suggests the 3 best technicians nearby.

SE331 Software Engineering Design Capstone Project.

## Tech stack

| Part     | Tools                                               |
| -------- | --------------------------------------------------- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router |
| Backend  | Node.js, Express, TypeScript, Mongoose, Zod         |
| Database | MongoDB Atlas                                       |
| AI       | Google Gemini API (free tier)                       |
| Quality  | ESLint, Prettier, Vitest, Supertest                 |

## Project structure

```
karigor/
├── client/                React website
│   └── src/
│       ├── pages/         one file per page
│       ├── components/    shared UI pieces
│       └── lib/           API helper and other utilities
├── server/                Express API
│   ├── src/
│   │   ├── ai/            AI problem detector (prompt, answer format, result checks)
│   │   ├── config/        settings (.env) and database connection
│   │   ├── controllers/   handle requests and send responses
│   │   ├── data/          starting data: services, price list, safety tips, areas
│   │   ├── middleware/    error handling, login checks
│   │   ├── models/        Mongoose models
│   │   ├── routes/        API routes under /api/v1
│   │   ├── services/      business logic
│   │   └── utils/
│   ├── scripts/           AI check script and test cases
│   └── tests/             automatic tests
└── docs/                  planning documents (start with docs/README.md)
```

## Getting started

You need **Node.js 22** or newer.

```bash
npm install                                  # install everything (run in this folder)
cp server/.env.example server/.env           # then fill in the values
cp client/.env.example client/.env
npm run seed -w server                       # fill the database with the catalog and test accounts
npm run dev                                  # starts the API (port 4000) and website (port 5173)
```

Open <http://localhost:5173>. The home page shows "API connected" when both parts are running.

## Commands

Run these from the `karigor` folder:

| Command                     | What it does                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`               | Start the API and the website together                                             |
| `npm test`                  | Run all automatic tests                                                            |
| `npm run lint`              | Check the code for mistakes (ESLint)                                               |
| `npm run format`            | Format all code (Prettier)                                                         |
| `npm run typecheck`         | Check TypeScript types                                                             |
| `npm run check`             | Format check + lint + typecheck + tests (run before every commit)                  |
| `npm run build`             | Build the API and the website for production                                       |
| `npm run seed -w server`    | Fill the database with the catalog, an admin and test accounts (safe to run again) |
| `npm run test:ai -w server` | Try the AI on 22 real-looking problems (needs a Gemini key)                        |

## Test accounts

After `npm run seed -w server`:

| Role        | Phone                          | Password                          |
| ----------- | ------------------------------ | --------------------------------- |
| Admin       | `ADMIN_PHONE` in `server/.env` | `ADMIN_PASSWORD` in `server/.env` |
| Customers   | 01800000001, 01800000002       | `TEST_USER_PASSWORD`              |
| Technicians | 01700000001 to 01700000019     | `TEST_USER_PASSWORD`              |

Technicians 01700000018 and 01700000019 are waiting for admin approval, and 01700000009 is on
leave (not accepting jobs).
