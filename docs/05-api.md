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

| Method | Path                        | Who    | What it does                                                |
| ------ | --------------------------- | ------ | ----------------------------------------------------------- |
| GET    | `/services`                 | Public | The 7 services with their skills                            |
| GET    | `/services/:id/quick-picks` | Public | Quick-pick buttons for the quick path (from the price list) |

### Problems and AI

| Method | Path                    | Who | What it does                                                                                                                                                 |
| ------ | ----------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/problems/analyze`     | C   | Sends text (+ up to 3 photos, + chosen service on the quick path) to the AI; returns the result, price estimate and safety tips. Limit: 10 per hour per user |
| GET    | `/problems/:id`         | C   | A saved AI result                                                                                                                                            |
| PATCH  | `/problems/:id`         | C   | Customer changes the service type (`finalServiceId`)                                                                                                         |
| POST   | `/problems/:id/matches` | C   | Body: location and date/time. Returns the top 3 technicians with the facts behind each                                                                       |

### Technicians

| Method | Path                           | Who | What it does                                        |
| ------ | ------------------------------ | --- | --------------------------------------------------- |
| GET    | `/technicians/:id`             | Any | Public profile: services, skills, rating            |
| GET    | `/technicians/:id/reviews`     | Any | Reviews for a technician                            |
| GET    | `/technicians/me/profile`      | T   | My own profile and approval status (done)           |
| PUT    | `/technicians/me/profile`      | T   | Save services, skills, area, location, hours (done) |
| POST   | `/technicians/me/nid`          | T   | Upload NID photo (private) (done)                   |
| PATCH  | `/technicians/me/availability` | T   | Turn "accepting jobs" on or off (done)              |

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
- `serviceRadiusKm` is optional (default 10). Days are 0 = Sunday to 6 = Saturday.
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

| Method | Path                     | Who  | What it does                                                                                                 |
| ------ | ------------------------ | ---- | ------------------------------------------------------------------------------------------------------------ |
| POST   | `/bookings`              | C    | Book a technician: problem id, technician id, date/time, location, address                                   |
| GET    | `/bookings`              | C, T | My bookings (customer) or my jobs (technician); filter by `?status=`                                         |
| GET    | `/bookings/:id`          | C, T | One booking (only the two people in it, or the admin)                                                        |
| PATCH  | `/bookings/:id/status`   | C, T | Change status, following the rules in [03-booking-flow.md](03-booking-flow.md); `finalPrice` when completing |
| GET    | `/bookings/:id/messages` | C, T | Chat history                                                                                                 |
| POST   | `/bookings/:id/review`   | C    | Rating (1–5) and comment, once, after completion                                                             |

### Admin

| Method              | Path                                                          | Who | What it does                                                                                                       |
| ------------------- | ------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------ |
| GET                 | `/admin/stats`                                                | A   | Numbers for the dashboard                                                                                          |
| GET                 | `/admin/technicians?status=pending`                           | A   | Technicians waiting for approval                                                                                   |
| GET                 | `/admin/technicians/:id/nid`                                  | A   | Short-lived link to the NID photo (done): `{ url, expiresAt }`, valid 5 minutes; `:id` is the technician's user id |
| PATCH               | `/admin/technicians/:id/approval`                             | A   | Approve or reject (with reason)                                                                                    |
| GET                 | `/admin/users`                                                | A   | All users                                                                                                          |
| PATCH               | `/admin/users/:id/status`                                     | A   | Block or unblock                                                                                                   |
| GET                 | `/admin/bookings`                                             | A   | All bookings                                                                                                       |
| POST, PATCH, DELETE | `/admin/services`, `/admin/price-items`, `/admin/safety-tips` | A   | Manage the catalog                                                                                                 |

## Live events (Socket.IO)

The client connects with the same token: `io(URL, { auth: { token } })`.

| Event            | Direction           | Data                    | When                                  |
| ---------------- | ------------------- | ----------------------- | ------------------------------------- |
| `booking:join`   | client → server     | `{ bookingId }`         | Opening a booking page                |
| `message:send`   | client → server     | `{ bookingId, text }`   | Sending a chat message                |
| `message:new`    | server → clients    | the saved message       | Someone in the booking sent a message |
| `booking:status` | server → clients    | `{ bookingId, status }` | The booking status changed            |
| `booking:new`    | server → technician | booking summary         | A customer booked this technician     |
