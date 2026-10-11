# Pages

The website works on phones first, then on bigger screens.

## Page list

| #   | Page                          | Link                 | Who        | What is on it                                                                                                                 |
| --- | ----------------------------- | -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Home                          | `/`                  | Everyone   | What Karigor does, the 7 services, "Get help now" button                                                                      |
| 2   | Login                         | `/login`             | Everyone   | Phone or email, password                                                                                                      |
| 3   | Sign up                       | `/register`          | Everyone   | Choose Customer or Technician, then name, phone, email, password                                                              |
| 4   | Get help (new problem)        | `/request`           | Customer   | Two tabs: **Describe** (text and up to 3 photos) and **Quick path** (service, one line, quick picks)                          |
| 5   | Result and top 3              | `/request/:id`       | Customer   | AI result, safety tips (if emergency), price estimate, change service, map pin, date and time, top 3 technicians, Book button |
| 6   | My bookings                   | `/bookings`          | Customer   | List of bookings with status                                                                                                  |
| 7   | Booking details               | `/bookings/:id`      | Customer   | Status timeline, technician details, chat, cancel button, review form after completion                                        |
| 8   | Technician profile (public)   | `/technicians/:id`   | Customer   | Name, services, skills, rating, reviews                                                                                       |
| 9   | My technician profile         | `/tech/profile`      | Technician | Services, skills, area and map pin, working days and hours, NID upload, approval status                                       |
| 10  | My jobs                       | `/tech/jobs`         | Technician | Tabs: New requests, Upcoming, Done; "Accepting jobs" on/off switch                                                            |
| 11  | Job details                   | `/tech/jobs/:id`     | Technician | Problem summary and photos, estimate, accept or reject, status buttons, chat, final price                                     |
| 12  | Admin dashboard               | `/admin`             | Admin      | Total users, technicians waiting for approval, bookings by status and by service                                              |
| 13  | Technician approvals          | `/admin/technicians` | Admin      | Pending list, NID photo, approve or reject with a reason                                                                      |
| 14  | Services, prices, safety tips | `/admin/catalog`     | Admin      | Add, edit and remove skills, price items and safety tips                                                                      |
| 15  | Bookings and users            | `/admin/bookings`    | Admin      | All bookings; block or unblock users                                                                                          |

## Sketches of the main screens

These are rough layouts, not final designs.

### 4. Get help

```
┌─────────────────────────────────────┐
│  [ Describe ]   [ Quick path ]      │
│                                     │
│  What is the problem?               │
│  ┌───────────────────────────────┐  │
│  │ রান্নাঘরের কল দিয়ে পানি পড়ছে │  │
│  └───────────────────────────────┘  │
│  [ + Add photo ]  (up to 3)         │
│                                     │
│        [ Find the right karigor ]   │
└─────────────────────────────────────┘

Quick path tab:
  [Plumber] [Electrician] [Painter] [Gas Fitter] [AC Repair] [Carpenter] [Cleaner]
  What needs fixing?  [ fan not working        ]
  Quick picks: (Fan not working) (Switch burnt) (New light fitting)
```

### 5. Result and top 3

```
┌─────────────────────────────────────┐
│ ⚠ EMERGENCY (only if needed)        │
│   1. Turn off the gas ...  Call 999 │
├─────────────────────────────────────┤
│ Plumber · Normal · AI is sure: High │
│ "Kitchen tap is leaking."           │
│ [ Change service ]                  │
│                                     │
│ Estimated cost: Tk 200 – 400        │
│ + parts. Final price agreed after   │
│ checking.                           │
├─────────────────────────────────────┤
│ Where and when?                     │
│ [  map: pin your home  ]            │
│ Date [ 14 Oct ]  Time [ 10:00 AM ]  │
│            [ Show technicians ]     │
├─────────────────────────────────────┤
│ ★ Best match                        │
│ Technician A                        │
│ 2 km · 4.6 stars (14) · 18 tap      │
│ repairs · has tap repair skill      │
│                          [ Book ]   │
│ Technician B ...         [ Book ]   │
│ Technician C ...         [ Book ]   │
└─────────────────────────────────────┘
```

### 11. Job details (technician)

```
┌─────────────────────────────────────┐
│ New request · Plumber · Normal      │
│ "Kitchen tap is leaking."  [photo]  │
│ Mirpur · 2 km · Tue 14 Oct, 10 AM   │
│ Estimate: Tk 200 – 400              │
│                                     │
│   [ Reject ]          [ Accept ]    │
├─────────────────────────────────────┤
│ After accepting:                    │
│ Address: House 12, Road 3, ...      │
│ [ On the way ] [ Arrived ]          │
│ [ Completed: final price Tk ____ ]  │
│                                     │
│ Chat                                │
│ ┌───────────────────────────────┐   │
│ │ Customer: Gate is on the left │   │
│ └───────────────────────────────┘   │
│ [ type a message...     ] [Send]    │
└─────────────────────────────────────┘
```

### 13. Technician approvals (admin)

```
┌──────────────────────────────────────────────────┐
│ Waiting for approval (3)                         │
├──────────────────────────────────────────────────┤
│ Rahim Uddin · Electrician · Mirpur · 5 years     │
│ Skills: fan, wiring, IPS                         │
│ [ View NID photo ]                               │
│ [ Reject (reason) ]               [ Approve ]    │
└──────────────────────────────────────────────────┘
```
