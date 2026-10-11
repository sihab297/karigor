# Database Design

Database: **MongoDB Atlas** (free cluster), used through **Mongoose**.

## Collections at a glance

```
users ─────────────┬──────────────── 1 : 1 ──── technicianProfiles
  │                │                              (skills, location, hours, NID, rating)
  │ customer       │ technician
  ▼                ▼
problemReports ──► bookings ◄──────── messages   (chat, many per booking)
 (AI result)        │
                    └──────────────── reviews    (one per booking)

services ──► priceItems        safetyTips
(catalog the admin manages; also sent to the AI)
```

| Collection           | What it stores                                    |
| -------------------- | ------------------------------------------------- |
| `users`              | Every account: customers, technicians and admins  |
| `technicianProfiles` | Extra details for technicians only                |
| `services`           | The 7 services and their skills                   |
| `priceItems`         | The price list, one document per job type         |
| `safetyTips`         | Checked safety steps for each emergency type      |
| `problemReports`     | What the customer wrote, and what the AI answered |
| `bookings`           | A booking between one customer and one technician |
| `messages`           | Chat messages inside a booking                    |
| `reviews`            | A customer's rating and comment after a job       |

The starting data for `services`, `priceItems` and `safetyTips` comes from the JSON files in
`server/src/data/` (see [01-data-lists.md](01-data-lists.md)). A seed script will load them into
MongoDB, and after that the admin edits them from the dashboard.

## Fields

### users

| Field          | Type   | Notes                                       |
| -------------- | ------ | ------------------------------------------- |
| `name`         | string | required                                    |
| `phone`        | string | required, unique, Bangladeshi mobile number |
| `email`        | string | unique, optional                            |
| `passwordHash` | string | bcrypt hash, never the real password        |
| `role`         | enum   | `customer`, `technician`, `admin`           |
| `status`       | enum   | `active`, `blocked`                         |
| `createdAt`    | date   | automatic (`updatedAt` too)                 |

### technicianProfiles

| Field                      | Type             | Notes                                                       |
| -------------------------- | ---------------- | ----------------------------------------------------------- |
| `userId`                   | ObjectId → users | unique, one profile per technician                          |
| `serviceIds`               | string[]         | e.g. `["electrician"]`                                      |
| `skillIds`                 | string[]         | e.g. `["fan", "ips"]`, chosen from the service's skill list |
| `areaName`                 | string           | e.g. "Mirpur"                                               |
| `location`                 | GeoJSON Point    | `{ type: "Point", coordinates: [lng, lat] }` (lng first!)   |
| `serviceRadiusKm`          | number           | default 10                                                  |
| `workingDays`              | number[]         | 0 = Sunday … 6 = Saturday                                   |
| `workingHours`             | object           | `{ start: "09:00", end: "20:00" }`                          |
| `experienceYears`          | number           |                                                             |
| `acceptingJobs`            | boolean          | technician can switch off when busy or on leave             |
| `nidPhotoUrl`              | string           | private Cloudinary image, only the admin can open it        |
| `profilePhotoUrl`          | string           | optional                                                    |
| `approvalStatus`           | enum             | `pending`, `approved`, `rejected`                           |
| `rejectionReason`          | string           | when rejected                                               |
| `ratingAvg`, `ratingCount` | number           | updated when a review is added                              |
| `jobsDone`                 | object           | completed jobs per service, e.g. `{ "electrician": 18 }`    |

Indexes: `location` (**2dsphere**, for "near me" search), `{ approvalStatus, serviceIds }`.

### services

| Field    | Type    | Notes                                 |
| -------- | ------- | ------------------------------------- |
| `_id`    | string  | readable id, e.g. `"plumber"`         |
| `name`   | string  | "Plumber"                             |
| `nameBn` | string  | "প্লাম্বার"                           |
| `skills` | array   | `[{ id: "tap-repair", name: "..." }]` |
| `active` | boolean |                                       |

### priceItems

| Field                  | Type              | Notes                             |
| ---------------------- | ----------------- | --------------------------------- |
| `_id`                  | string            | readable id, e.g. `"plumber-tap"` |
| `serviceId`            | string → services |                                   |
| `skillId`              | string / null     | null for "Visit and check"        |
| `name`                 | string            | "Tap repair or replacement"       |
| `minPrice`, `maxPrice` | number            | in Taka                           |
| `unit`                 | string            | "per tap"                         |
| `active`               | boolean           |                                   |

### safetyTips

| Field  | Type     | Notes                             |
| ------ | -------- | --------------------------------- |
| `_id`  | string   | emergency type, e.g. `"gas-leak"` |
| `name` | string   | "Gas smell or gas leak"           |
| `tips` | string[] | in the order they should be shown |

### problemReports

Every AI check is saved. This lets the booking keep the AI result, and lets us measure how often
the AI was right (useful for the final report).

| Field             | Type             | Notes                                                                                                        |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `customerId`      | ObjectId → users |                                                                                                              |
| `mode`            | enum             | `describe` or `quick`                                                                                        |
| `chosenServiceId` | string           | quick path only                                                                                              |
| `text`            | string           | what the customer wrote                                                                                      |
| `photoUrls`       | string[]         | up to 3                                                                                                      |
| `ai`              | object           | the checked AI result (service, skills, summary, urgency, confidence, emergency type, price lines, estimate) |
| `aiLatencyMs`     | number           |                                                                                                              |
| `finalServiceId`  | string           | after the customer accepts or changes the AI's choice                                                        |

### bookings

| Field             | Type                      | Notes                                                            |
| ----------------- | ------------------------- | ---------------------------------------------------------------- |
| `customerId`      | ObjectId → users          |                                                                  |
| `technicianId`    | ObjectId → users          |                                                                  |
| `problemReportId` | ObjectId → problemReports |                                                                  |
| `serviceId`       | string                    |                                                                  |
| `scheduledAt`     | date                      | the chosen date and time                                         |
| `location`        | GeoJSON Point             | the pinned home location                                         |
| `addressText`     | string                    | house, road, flat (shown to the technician only after accepting) |
| `status`          | enum                      | see [03-booking-flow.md](03-booking-flow.md)                     |
| `statusHistory`   | array                     | `[{ status, at, byUserId }]`                                     |
| `estimate`        | object                    | `{ min, max }` copied from the AI result                         |
| `finalPrice`      | number                    | entered when the job is completed                                |
| `cancelReason`    | string                    |                                                                  |

Indexes: `{ technicianId, status }`, `{ customerId, createdAt }`, `{ technicianId, scheduledAt }`.

### messages

| Field       | Type                | Notes          |
| ----------- | ------------------- | -------------- |
| `bookingId` | ObjectId → bookings |                |
| `senderId`  | ObjectId → users    |                |
| `text`      | string              | max 1000 chars |
| `createdAt` | date                |                |

Index: `{ bookingId, createdAt }`.

### reviews

| Field          | Type                | Notes                           |
| -------------- | ------------------- | ------------------------------- |
| `bookingId`    | ObjectId → bookings | unique (one review per booking) |
| `customerId`   | ObjectId → users    |                                 |
| `technicianId` | ObjectId → users    |                                 |
| `rating`       | number              | 1 to 5                          |
| `comment`      | string              | optional                        |

## Design notes

- **Why a separate `technicianProfiles` collection?** Customers and admins don't need these fields,
  and it keeps `users` small and the same for every role.
- **Why save `problemReports`?** The booking needs the AI result, and saving every check lets us
  count how accurate the AI is.
- **Coordinates:** MongoDB stores `[longitude, latitude]`, the opposite of how maps usually show
  them. Mixing these up is a common bug.
- **Privacy:** the customer's address text is only shown to the technician after they accept the
  booking. NID photos are only visible to the admin.
