# API List

## Rules for every endpoint

- **Base address:** `/api/v1` (for example `http://localhost:4000/api/v1/health`)
- **Login:** after logging in, the client sends the token in a header:
  `Authorization: Bearer <token>`. A header is used instead of a cookie because the website
  (Vercel) and the API (Render) are on different domains, where cookies are often blocked.
- **Success response:** `{ "data": ... }`
- **Error response:** `{ "error": { "code": "NOT_FOUND", "message": "...", "details": ... } }`
- **Lists:** `?page=1&limit=20`
- **Roles:** C = customer, T = technician, A = admin, Any = anyone logged in, Public = no login.
  The server checks this on every request with `requireAuth` and `requireRole(...)`, using the
  role saved in the database, so a role change or a block works straight away.

## Endpoints

### Health

| Method | Path      | Who    | What it does                   |
| ------ | --------- | ------ | ------------------------------ |
| GET    | `/health` | Public | Says the API is running (done) |

### Accounts

| Method | Path             | Who    | What it does                                                    |
| ------ | ---------------- | ------ | --------------------------------------------------------------- |
| POST   | `/auth/register` | Public | Sign up as customer or technician; returns a token (done)       |
| POST   | `/auth/login`    | Public | Log in with phone or email and password; returns a token (done) |
| GET    | `/auth/me`       | Any    | The logged-in user (done)                                       |

**Sign up:** `POST /auth/register`

```json
{
  "name": "Nusrat Jahan",
  "phone": "01812345678",
  "email": "",
  "password": "at-least-8",
  "role": "customer"
}
```

- `email` is optional. `role` is `customer` or `technician` (nobody can sign up as admin).
- The phone can be typed any common way (`+880 1812-345678`, Bangla digits); it is saved as
  `01812345678`.

**Log in:** `POST /auth/login`

```json
{ "phoneOrEmail": "01812345678", "password": "at-least-8" }
```

**Both answer with:** `{ "data": { "token": "...", "user": { "id", "name", "phone", "email", "role", "status", ... } } }`.
Keep the token and send it as `Authorization: Bearer <token>`. It lasts 7 days.

**Errors**

| Status | Code                | When                                                            |
| ------ | ------------------- | --------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`  | A field is wrong; `details` lists `{ field, message }` for each |
| 401    | `WRONG_LOGIN`       | Wrong phone/email or password (same message for both)           |
| 401    | `NOT_LOGGED_IN`     | No token sent                                                   |
| 401    | `INVALID_TOKEN`     | Token is fake, expired, or the account no longer exists         |
| 403    | `ACCOUNT_BLOCKED`   | The admin blocked this account                                  |
| 403    | `NOT_ALLOWED`       | Logged in, but this role cannot use the endpoint                |
| 409    | `PHONE_TAKEN`       | Sign up with a phone that already has an account                |
| 409    | `EMAIL_TAKEN`       | Sign up with an email that already has an account               |
| 429    | `TOO_MANY_ATTEMPTS` | More than 20 sign-up/login tries in 15 minutes from one IP      |

### Catalog

| Method | Path                        | Who    | What it does                                                                                                                          |
| ------ | --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/services`                 | Public | Active services with their skills, A to Z (done)                                                                                      |
| GET    | `/areas`                    | Public | Dhaka areas with map positions, A to Z (done)                                                                                         |
| GET    | `/services/:id/quick-picks` | Public | Quick-pick buttons for the quick path (done): `{ quickPicks: [{ priceItemId, label }] }`, e.g. "Fan not working", in price list order |

### Problems and AI

| Method | Path                    | Who  | What it does                                                                                                                             |
| ------ | ----------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/problems/analyze`     | C    | Sends text (+ up to 3 photos, + chosen service on the quick path) to the AI and saves the result (done). Limit: 10 per hour per customer |
| GET    | `/problems/:id`         | C, A | A saved problem with its AI result (done); only the customer who sent it, or the admin                                                   |
| PATCH  | `/problems/:id`         | C    | The customer accepts or changes the service: `{ "finalServiceId": "plumber" }` (done)                                                    |
| POST   | `/problems/:id/matches` | C    | Smart Matching (done): the top 3 technicians for this problem at the customer's pin and time, with the facts behind each                 |

**Check a problem:** `POST /problems/analyze` as `multipart/form-data`:

| Field             | Notes                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `text`            | What is wrong, in Bangla, English or Banglish. 3 to 500 characters |
| `photos`          | 0 to 3 files, JPG or PNG, up to 5 MB each (first bytes checked)    |
| `chosenServiceId` | Quick path only: the service the customer picked                   |

- Text or at least one photo is needed.
- Photos are saved on Cloudinary as **authenticated** images under random names, then sent to the
  AI together with the text. Phone numbers and emails in the text are hidden from the AI.
- The AI works from the catalog in the database, so the admin's price changes count straight away.
- Answers 201 with `{ report }`: `mode` (`describe` or `quick`), `text`, `chosenServiceId`,
  `photoUrls` (signed links), `ai` (service, skills, summary, urgency, confidence, safety tips,
  price lines, estimate, `matchesChosenService`, `followUpQuestion`, `model`, `latencyMs`).
- If the AI fails or is busy, the report is still saved with `ai: null` and an `aiError` code
  (`AI_FAILED`, `AI_NOT_SET_UP`), so the customer can choose the service themselves.
- Each check counts towards the hourly limit (`AI_CHECKS_PER_HOUR` in `.env`, default 10). The
  limit is checked before any photo is read.
- Errors: `VALIDATION_ERROR`, `WRONG_FILE_TYPE`, `FILE_TOO_LARGE`, `TOO_MANY_FILES` (400),
  `TOO_MANY_CHECKS` (429, the message says how many minutes to wait).

**Other people's problems** answer 404 `PROBLEM_NOT_FOUND`, the same as a problem that doesn't
exist. `PATCH` only changes `finalServiceId`; the AI result stays as it was, so we can later
measure how often the AI was right.

**Find the top 3:** `POST /problems/:id/matches`

```json
{ "location": { "lat": 23.8223, "lng": 90.3654 }, "when": "2026-10-15T10:00:00+06:00" }
```

- `location` must be inside Dhaka. `when` is any ISO date and time, from now up to 30 days ahead.
- **Emergency** problems may leave out `when`: then the search is for people free right now,
  within 5 km. If the customer picks a time ("Book for later"), it is a normal search.
- The service is the customer's choice (`finalServiceId`), else the AI's, else the quick path
  service. With none of these the answer is 409 `CHOOSE_SERVICE`.
- How technicians are kept and ranked: see [06-ai-design.md](06-ai-design.md#smart-matching-top-3-technicians).
- Answers `{ serviceId, serviceName, emergency, when, searchedKm, matches }`. Each match:
  `technicianId`, `name`, `areaName`, `distanceKm`, `rating` (`null` = new), `ratingCount`,
  `jobsDone`, `experienceYears`, `matchedSkills` (`[{ id, name }]`) and `bestMatch` (first only).
  The score is never sent, and neither is the technician's exact location or phone number.
- `matches` is empty when nobody is free then; the page suggests another time.
- Errors: `VALIDATION_ERROR` for `location` or `when` (400), `CHOOSE_SERVICE` (409),
  `PROBLEM_NOT_FOUND` (404).

### Technicians

| Method | Path                           | Who | What it does                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------ | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/technicians/:id`             | Any | Public profile (done): name, area, experience, rating, jobs done (in total and per service), services with only this technician's skills, working days and hours. Never the phone, exact location or NID. Only approved technicians who are not blocked (404 `TECHNICIAN_NOT_FOUND`), except for the admin. `:id` is the technician's user id |
| GET    | `/technicians/:id/reviews`     | Any | Reviews (done): `{ total, reviews }`, the latest 20, each with the rating, comment, service name, date and the customer's short name ("Nusrat J."). Same visibility rule                                                                                                                                                                      |
| GET    | `/technicians/me/profile`      | T   | My own profile and approval status (done)                                                                                                                                                                                                                                                                                                     |
| PUT    | `/technicians/me/profile`      | T   | Save services, skills, area, location, hours (done)                                                                                                                                                                                                                                                                                           |
| POST   | `/technicians/me/nid`          | T   | Upload NID photo (private) (done)                                                                                                                                                                                                                                                                                                             |
| PATCH  | `/technicians/me/availability` | T   | Turn "accepting jobs" on or off (done)                                                                                                                                                                                                                                                                                                        |

**Get my profile:** `GET /technicians/me/profile` answers `{ "data": { "profile": null } }` until
the technician saves it for the first time.

**Save my profile:** `PUT /technicians/me/profile`

```json
{
  "serviceIds": ["electrician"],
  "skillIds": ["fan", "ips"],
  "areaName": "Mirpur",
  "location": { "lat": 23.8223, "lng": 90.3654 },
  "serviceRadiusKm": 10,
  "workingDays": [6, 0, 1, 2, 3, 4],
  "workingHours": { "start": "09:00", "end": "20:00" },
  "experienceYears": 5
}
```

- 1 to 3 services, checked against the catalog in the database (switched-off services are refused).
- Skills must belong to the chosen services, with at least one skill for each service.
- `location` must be inside Dhaka. It is saved as GeoJSON `[lng, lat]`, rounded to 6 decimals.
- `serviceRadiusKm` is 5, 10 or 15 (default 10); that is enough for Dhaka. Days are 0 = Sunday
  to 6 = Saturday.
- The first save creates the profile with `approvalStatus: "pending"`. If a rejected technician
  saves again, the profile goes back to `pending` so the admin can check it again.

**Accepting jobs:** `PATCH /technicians/me/availability` with `{ "acceptingJobs": false }`.
Answers 404 `PROFILE_NOT_FOUND` if the profile has not been saved yet.

**NID photo:** `POST /technicians/me/nid` as `multipart/form-data` with the file in the `photo`
field.

- JPG or PNG, up to 5 MB. The first bytes of the file are checked, so a renamed file is refused.
- Saved on Cloudinary as an **authenticated** image (no public link), always as JPG.
- Answers with the profile, which shows `hasNidPhoto: true` (the photo id itself is never sent).
- A rejected technician who uploads a new photo goes back to `pending`.
- Errors: `NO_PHOTO`, `WRONG_FILE_TYPE`, `FILE_TOO_LARGE` (400), `PROFILE_NOT_FOUND` (404).

### Bookings, chat and reviews

| Method | Path                     | Who     | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/bookings`              | C       | Book a technician (done): `{ problemId, technicianId, location, when?, addressText, note? }`. Leave out `when` for an emergency "right now". Matching runs again, so the technician must still be in the top 3 (409 `TECHNICIAN_NOT_AVAILABLE`) and have no accepted job within 2 hours of that time (409 `TECHNICIAN_BUSY`). One open booking per problem (409 `ALREADY_BOOKED`). Saves `status: requested` and copies the AI estimate when the service is the AI's. Returns `{ booking, technician: { id, name } }` |
| GET    | `/bookings`              | C, T    | My bookings (customer) or my jobs (technician), newest first (done): `{ bookings }`; filter with `?status=requested,accepted`                                                                                                                                                                                                                                                                                                                                                                                         |
| GET    | `/bookings/:id`          | C, T, A | One booking, only for the two people in it or the admin (done): `{ booking }` with `serviceName`, `problem` summary, `technician` (name, rating), `customer`, `statusHistory` and `actions` (the status changes this person can make now). Phone numbers are shared only from accepted to arrived; the technician sees `addressText` only after accepting (before that, the map pin and the customer's short name like "Nusrat J.")                                                                                   |
| PATCH  | `/bookings/:id/status`   | C, T    | Change status (done): `{ status, finalPrice?, reason? }`, following the rules in [03-booking-flow.md](03-booking-flow.md). `finalPrice` is required for `completed` and `reason` for cancelling an accepted booking (400). A step the rules don't allow is 409 `STATUS_CHANGE_NOT_ALLOWED`; the other side's step is 403 `NOT_ALLOWED`; accepting a job that clashes with another accepted one is 409 `TECHNICIAN_BUSY`. Adds to `statusHistory`; completing adds 1 to the technician's `jobsDone` for that service   |
| GET    | `/bookings/:id/messages` | C, T    | Chat history (done): `{ messages, chatOpen }`, oldest first (the latest 300). Each message is `{ id, bookingId, text, at, from: 'customer' \| 'technician' }`. Only the two people in the booking (404 for anyone else). `chatOpen` is true from accepted until arrived; after that the chat is read-only                                                                                                                                                                                                             |
| POST   | `/bookings/:id/review`   | C       | Rating and comment (done): `{ rating: 1–5, comment? }` (comment up to 500 characters). Only the booking's customer (403 for the technician), only when `completed` (409 `REVIEW_NOT_ALLOWED`), once (409 `ALREADY_REVIEWED`). Adds the rating to the technician's `ratingAvg` and `ratingCount` in one update. `GET /bookings/:id` shows it as `review`, with `canReview` while the customer can still review                                                                                                         |

### Admin

| Method              | Path                                                          | Who | What it does                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET                 | `/admin/stats`                                                | A   | Numbers for the dashboard                                                                                                                                                                                         |
| GET                 | `/admin/technicians?status=pending`                           | A   | Technicians in one tab (done): `{ technicians, counts }`; each has the profile plus `user` (name, phone, email); `status` is `pending` (oldest first), `approved` or `rejected` (newest decision first)           |
| GET                 | `/admin/technicians/:id/nid`                                  | A   | Short-lived link to the NID photo (done): `{ url, expiresAt }`, valid 5 minutes; `:id` is the technician's user id                                                                                                |
| PATCH               | `/admin/technicians/:id/approval`                             | A   | Approve or reject (done): `{ "status": "approved" }` or `{ "status": "rejected", "reason": "..." }` (5 to 300 characters). Approving needs an NID photo (409 `NID_REQUIRED`). Saves `reviewedBy` and `reviewedAt` |
| GET                 | `/admin/users`                                                | A   | All users                                                                                                                                                                                                         |
| PATCH               | `/admin/users/:id/status`                                     | A   | Block or unblock                                                                                                                                                                                                  |
| GET                 | `/admin/bookings`                                             | A   | All bookings                                                                                                                                                                                                      |
| POST, PATCH, DELETE | `/admin/services`, `/admin/price-items`, `/admin/safety-tips` | A   | Manage the catalog                                                                                                                                                                                                |

## Live events (Socket.IO)

The client connects to the API's address (same port) with the same token:
`io(URL, { auth: { token } })` (done, `server/src/realtime/socket.ts`). Without a valid token, or
for a blocked user, the connection is refused with `NOT_LOGGED_IN`. Each user also joins a
personal room, used for `booking:new`.

| Event            | Direction           | Data                                                                            | When                                                                                                                                                                                                    |
| ---------------- | ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking:join`   | client → server     | `{ bookingId }`, answer `{ ok, message? }`                                      | Opening a booking page (done). Only the customer and technician of that booking can join its room                                                                                                       |
| `booking:leave`  | client → server     | `{ bookingId }`                                                                 | Leaving a booking page (done)                                                                                                                                                                           |
| `message:send`   | client → server     | `{ bookingId, text }`, answer `{ ok, message }` or `{ ok: false, code, error }` | Sending a chat message (done). Text is 1–1000 characters. Refused with `CHAT_CLOSED` unless the booking is accepted, on the way or arrived, and with `BOOKING_NOT_FOUND` for anyone outside the booking |
| `message:new`    | server → clients    | the saved message                                                               | Someone in the booking sent a message (done), sent to the booking's room, the sender included                                                                                                           |
| `booking:status` | server → clients    | `{ bookingId, status }`                                                         | The booking status changed (done), sent to the booking's room                                                                                                                                           |
| `booking:new`    | server → technician | `{ bookingId, serviceName, emergency }`                                         | A customer booked this technician (done), sent to the technician's personal room                                                                                                                        |
