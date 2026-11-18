# Manual Test Checklist

Every page, for every role, tested by hand as a real user would. Tick **PC** when a check works on
a computer and **Phone** when it works on a phone. Anything that doesn't work goes in the
[bugs table](#bugs-found) at the end.

The automatic tests (`npm run check`) already cover the server rules and each page's main
behaviour. This checklist is for what only a person can see: does it look right, does it feel
right, and does the whole story work from start to finish.

## Part A: Before you start

### 1. Start the project

In PowerShell, from the `karigor` folder:

```
npm ci                    # only after pulling new code (installs exactly the lockfile)
npm run seed -w server    # catalog, admin and test accounts (safe to run again)
npm run dev               # API on port 4000, website on port 5173
```

Open <http://localhost:5173>. Stop everything with `Ctrl + C`.

### 2. AI mode (cost)

`AI_MODE` in `server/.env`:

- `mock`: free keyword rules. Use this for almost all tests. It understands the example
  sentences in step 6.
- `real`: Claude (Gemini as backup). Each check costs about US$ 0.004. Use it only for the checks
  marked **(real AI)**. Restart `npm run dev` after changing `.env`.

### 3. Test accounts

| Role       | Phone                                                    | Password                          |
| ---------- | -------------------------------------------------------- | --------------------------------- |
| Admin      | `ADMIN_PHONE` in `server/.env`                           | `ADMIN_PASSWORD` in `server/.env` |
| Customer   | 01800000001 (Nusrat Jahan), 01800000002 (Imran Hossain)  | `TEST_USER_PASSWORD`              |
| Technician | 01700000001 to 01700000017 (approved)                    | `TEST_USER_PASSWORD`              |
| Waiting    | 01700000018 (Sohel Rana), 01700000019 (Arif Hasan)       | `TEST_USER_PASSWORD`              |
| On leave   | 01700000009 (Kamal Hossain, gas fitter, not taking jobs) | `TEST_USER_PASSWORD`              |

Useful technicians to book:

| Service     | Pin the map in            | Technicians                                                   |
| ----------- | ------------------------- | ------------------------------------------------------------- |
| Plumber     | Mirpur, Dhanmondi, Uttara | Rahim Uddin (…01), Abdul Karim (…02), Shafiqul Islam (…03)    |
| Electrician | Mirpur, Pallabi, Badda    | Jamal Hossain (…04), Tanvir Ahmed (…07), Habibur Rahman (…06) |
| Gas fitter  | Pallabi                   | Nazrul Islam (…08)                                            |
| AC repair   | Gulshan, Dhanmondi, Badda | Selim Reza (…10), Faruk Ahmed (…11), Habibur Rahman (…06)     |
| Painter     | Mohammadpur, Rampura      | Monir Hossain (…12), Babul Mia (…13)                          |
| Carpenter   | Farmgate, Uttara          | Shahidul Islam (…14), Anwar Hossain (…15)                     |
| Cleaner     | Banani, Bashundhara       | Rina Begum (…16), Shirin Akter (…17)                          |

### 4. Be three people at once

The login is saved per browser, so all tabs of one browser are the same person. Use:

- **Chrome, normal window:** the customer
- **Chrome, Incognito window (`Ctrl + Shift + N`):** the technician
- **Edge:** the admin

Put the customer and the technician side by side to see live updates and chat.

### 5. Testing on a phone

- **Quick way (on the computer):** press `F12`, then `Ctrl + Shift + M`, and choose a phone such
  as "iPhone 12 Pro" (390 px wide). Good for layout checks.
- **Real phone on the same Wi-Fi:**
  1. Run `ipconfig` and note the IPv4 address, for example `192.168.0.105`.
  2. `client/.env`: `VITE_API_URL=http://192.168.0.105:4000/api/v1`
  3. `server/.env`: `CLIENT_URL=http://192.168.0.105:5173`
  4. Start the two parts in two windows: `npm run dev -w server` and
     `npm run dev -w client -- --host`. Allow Node.js on **Private networks** if Windows asks.
  5. Open `http://192.168.0.105:5173` on the phone, and on the computer too (`localhost` won't
     work while `CLIENT_URL` points to the IP).
  6. "Use my location" needs a secure (https) site, so on this setup choose the area or tap the map
     instead. Check location again after the site is online.
  7. Afterwards, put both `.env` files back to `localhost`.
- **After deployment (#34):** just open the live link on the phone. This is the easiest way, and the
  phone column can wait until then.

### 6. Example problems (they work with the mock AI)

| Write this                                         | Expected                      |
| -------------------------------------------------- | ----------------------------- |
| রান্নাঘরের কল দিয়ে পানি পড়ছে                     | Plumber, normal               |
| bathroom er flush kaj korche na                    | Plumber, normal               |
| fan not working                                    | Electrician, normal           |
| রান্নাঘরে গ্যাসের গন্ধ পাচ্ছি                      | Gas fitter, **emergency**     |
| socket theke sparks berocche ar pora gondho ashche | Electrician, **emergency**    |
| সিলিং থেকে পানি পড়ছে, লাইটের সুইচের পাশ দিয়ে     | Plumber, **emergency**        |
| main darjar lock bhenge geche                      | Carpenter, urgent             |
| AC theke pani porche deyal beye                    | AC repair                     |
| sofa ar carpet clean korate chai                   | Cleaner                       |
| 3ta tap change korte hobe kitchen ar bathroom e    | Plumber, price for 3 taps     |
| Can you help me with my math homework?             | Not understood, asks for more |

### 7. Times that matter

Seeded technicians work **Saturday to Thursday, 9:00 AM to 8:00 PM** (Dhaka time); Friday is off.
"Right now" (emergencies) only finds people inside those hours. At night or on a Friday, use
"Book for later" or pick another day. A technician with an accepted job is not shown for 2 hours on
each side of it.

### 8. When something is wrong

Write it in the [bugs table](#bugs-found): the check ID, what you did, what happened, what should
have happened, PC or phone, and a screenshot if you can (`Win + Shift + S`).

## Part B: Checklist

### G. Every page

| ID  | Check                                                                                                                                       | PC  | Phone |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| G1  | Logo goes to the right home page; the menu shows only this role's pages                                                                     | [ ] | [ ]   |
| G2  | On a phone the menu button opens and closes the menu, and a link closes it                                                                  | [ ] | [ ]   |
| G3  | Nothing is cut off and the page never scrolls sideways                                                                                      | [ ] | [ ]   |
| G4  | Text is easy to read; buttons are easy to tap with a thumb                                                                                  | [ ] | [ ]   |
| G5  | The browser tab shows the page name                                                                                                         | [ ] | [ ]   |
| G6  | Refreshing any page keeps you logged in and on the same page                                                                                | [ ] | [ ]   |
| G7  | A wrong address (e.g. `/abc`) shows "Page not found" with a way back                                                                        | [ ] | [ ]   |
| G8  | Slow internet (F12 > Network > "Slow 4G"): a spinner shows while data loads                                                                 | [ ] | [ ]   |
| G9  | Stop the API (`Ctrl + C`) and refresh: "Can't open Karigor right now" with Try again; start it, Try again works and you are still logged in | [ ] | [ ]   |
| G10 | Any error shows a clear message in plain words, with a way to try again                                                                     | [ ] | [ ]   |
| G11 | Keyboard only: `Tab` reaches every button and field with a visible outline; `Enter` sends forms; `Esc` closes pop-ups                       | [ ] |       |
| G12 | Log out from the menu: back on the login page; the browser Back button doesn't show private pages                                           | [ ] | [ ]   |

### 1. Home page (`/`), logged out

| ID  | Check                                                                                        | PC  | Phone |
| --- | -------------------------------------------------------------------------------------------- | --- | ----- |
| H1  | Top part: what Karigor does and a "Get help" button                                          | [ ] | [ ]   |
| H2  | All 7 services show, each with its icon and starting price                                   | [ ] | [ ]   |
| H3  | "How it works", "Safety first", "Areas we cover" and "For technicians" sections look right   | [ ] | [ ]   |
| H4  | Each question in "Questions" opens and closes                                                | [ ] | [ ]   |
| H5  | Emergency line 999 and "Pay in cash after the work" are shown                                | [ ] | [ ]   |
| H6  | "Get help" when logged out goes to log in; after logging in as a customer you reach Get help | [ ] | [ ]   |
| H7  | "Are you a technician?" goes to sign up with "I am a karigor" chosen                         | [ ] | [ ]   |
| H8  | Logged in, Home still opens and the buttons go to your own pages                             | [ ] | [ ]   |

### 2. Sign up (`/register`)

| ID  | Check                                                                                                 | PC  | Phone |
| --- | ----------------------------------------------------------------------------------------------------- | --- | ----- |
| R1  | "I need a karigor" is chosen at first; switching to "I am a karigor" works                            | [ ] | [ ]   |
| R2  | Sending an empty form shows a message under each field, and nothing is sent                           | [ ] | [ ]   |
| R3  | Wrong phone (e.g. `12345`), wrong email and a password under 8 characters each show their own message | [ ] | [ ]   |
| R4  | Phone typed as `+880 1812-345678` or in Bangla digits is accepted                                     | [ ] | [ ]   |
| R5  | Email can be left empty                                                                               | [ ] | [ ]   |
| R6  | A phone that already has an account shows a clear message                                             | [ ] | [ ]   |
| R7  | The eye button shows and hides the password                                                           | [ ] | [ ]   |
| R8  | A new customer lands on Get help; a new technician lands on My profile                                | [ ] | [ ]   |
| R9  | The button shows it is working while the account is created (no double sign-up on a double tap)       | [ ] | [ ]   |

### 3. Log in (`/login`)

| ID  | Check                                                                                           | PC  | Phone |
| --- | ----------------------------------------------------------------------------------------------- | --- | ----- |
| L1  | Log in with a phone number; also with an email in CAPITAL letters                               | [ ] | [ ]   |
| L2  | Wrong password and unknown phone give the same message                                          | [ ] | [ ]   |
| L3  | Empty fields show messages without sending                                                      | [ ] | [ ]   |
| L4  | Customer lands on Get help, technician on My jobs, admin on the Dashboard                       | [ ] | [ ]   |
| L5  | Open `/bookings` logged out, log in: you land on My bookings (the page you wanted)              | [ ] | [ ]   |
| L6  | Logged in, opening `/login` takes you to your own home page                                     | [ ] | [ ]   |
| L7  | A customer opening `/admin` or `/tech/jobs` is sent to their own page (and the same for others) | [ ] | [ ]   |
| L8  | A blocked user can't log in and sees why                                                        | [ ] | [ ]   |
| L9  | No internet (F12 > Network > Offline): "Can't reach Karigor right now"                          | [ ] | [ ]   |

### 4. Get help (`/request`), customer

| ID  | Check                                                                                                      | PC  | Phone |
| --- | ---------------------------------------------------------------------------------------------------------- | --- | ----- |
| P1  | "Not sure who to call" (describe) and "I know the service" (quick path) both open                          | [ ] | [ ]   |
| P2  | The emergency box "Smell gas, see sparks or smoke?" shows the 999 number                                   | [ ] | [ ]   |
| P3  | Sending nothing shows "Tell us the problem or add a photo"; one or two letters shows "Write a little more" | [ ] | [ ]   |
| P4  | Add 1 to 3 photos: they preview and can be removed; a 4th is refused                                       | [ ] | [ ]   |
| P5  | A PDF or a photo over 5 MB is refused with a clear message                                                 | [ ] | [ ]   |
| P6  | On a phone, adding a photo can open the camera                                                             |     | [ ]   |
| P7  | While checking, a "checking" card shows your words and photos                                              | [ ] | [ ]   |
| P8  | Each example problem in Part A step 6 gives the expected service and urgency                               | [ ] | [ ]   |
| P9  | Quick path: choose a service, its quick picks show; tapping one goes to the result                         | [ ] | [ ]   |
| P10 | **(real AI)** A photo only (no text) of a real problem gives a sensible service                            | [ ] | [ ]   |
| P11 | **(real AI)** Your own sentences in Bangla, Banglish and English are understood                            | [ ] | [ ]   |
| P12 | More than 10 checks in one hour shows how many minutes to wait                                             | [ ] |       |

### 5. Result and top 3 (`/request/:id`), customer

| ID  | Check                                                                                                                   | PC  | Phone |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| M1  | Shows the service, a short summary and the urgency                                                                      | [ ] | [ ]   |
| M2  | Rough price with its lines (e.g. 3 taps); says the final price is agreed after checking                                 | [ ] | [ ]   |
| M3  | Emergency: safety steps show at the top with the 999 number                                                             | [ ] | [ ]   |
| M4  | "Math homework": "We couldn't tell what's wrong yet" with a way to choose the service                                   | [ ] | [ ]   |
| M5  | "Or choose the service yourself" changes the service; the price follows the new service or goes away                    | [ ] | [ ]   |
| M6  | Quick path with a wrong service (pick Plumber, write "AC theke pani porche"): the page says it may be the wrong service | [ ] | [ ]   |
| M7  | Choose an area from the list: the pin moves there; tapping the map moves the pin                                        | [ ] | [ ]   |
| M8  | "Use my location" asks for permission and moves the pin (https or localhost only)                                       | [ ] | [ ]   |
| M9  | When: Today, Tomorrow and "Pick another time"; past times can't be chosen                                               | [ ] | [ ]   |
| M10 | "Show the best karigors" gives up to 3 cards, the first marked "Best match"                                             | [ ] | [ ]   |
| M11 | Each card: distance, rating (or "New"), jobs done, experience and matching skills; no phone number                      | [ ] | [ ]   |
| M12 | The name opens the technician's profile in a new tab                                                                    | [ ] | [ ]   |
| M13 | A Friday or 11 PM: "Nobody is free then" with "Pick another time"                                                       | [ ] | [ ]   |
| M14 | Emergency in working hours: "Find karigors free right now" searches within 5 km; "Book for later" also works            | [ ] | [ ]   |
| M15 | Kamal Hossain (on leave) and the two waiting technicians never appear                                                   | [ ] | [ ]   |
| M16 | Book: the pop-up shows the service and rough price; the address is required; the note is optional                       | [ ] | [ ]   |
| M17 | "Send booking request" shows "Request sent" and "See my bookings"                                                       | [ ] | [ ]   |
| M18 | Booking the same problem again says you already sent a request                                                          | [ ] | [ ]   |
| M19 | Another customer opening this result link sees "We couldn't find this problem"                                          | [ ] | [ ]   |
| M20 | **(real AI)** With the AI key removed or no internet on the server: a clear message and you can choose the service      | [ ] |       |

### 6. My bookings (`/bookings`), customer

| ID  | Check                                                                           | PC  | Phone |
| --- | ------------------------------------------------------------------------------- | --- | ----- |
| B1  | Active and past bookings are listed, newest first, each with a coloured status  | [ ] | [ ]   |
| B2  | Each shows the service, technician, date and time ("Right now" for emergencies) | [ ] | [ ]   |
| B3  | A new customer sees friendly empty messages                                     | [ ] | [ ]   |
| B4  | Tapping a booking opens its details                                             | [ ] | [ ]   |

### 7. Booking details (`/bookings/:id`), customer

| ID  | Check                                                                                                                                     | PC  | Phone |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| D1  | Progress: Request sent, Accepted, On the way, Arrived, Work done, with times                                                              | [ ] | [ ]   |
| D2  | Technician's name and rating; the phone shows only from Accepted to Arrived                                                               | [ ] | [ ]   |
| D3  | Address, note, rough price and "Pay: Cash, after the work" show                                                                           | [ ] | [ ]   |
| D4  | Status changes made by the technician show **without refreshing**                                                                         | [ ] | [ ]   |
| D5  | Cancel while "Waiting for reply": no reason needed                                                                                        | [ ] | [ ]   |
| D6  | Cancel after Accepted: a reason (5+ characters) is required                                                                               | [ ] | [ ]   |
| D7  | Once the technician is on the way, there is no Cancel button                                                                              | [ ] | [ ]   |
| D8  | Before Accepted the chat says it opens when the technician accepts                                                                        | [ ] | [ ]   |
| D9  | Chat: messages arrive both ways at once, newest at the bottom, with times; long text wraps                                                | [ ] | [ ]   |
| D10 | An empty message can't be sent                                                                                                            | [ ] | [ ]   |
| D11 | After Work done the chat is read-only; a chat that never had messages is hidden                                                           | [ ] | [ ]   |
| D12 | If the technician says no: "Not accepted" and a link to choose another karigor for the same problem; booking another works                | [ ] | [ ]   |
| D13 | After Work done: the final price shows, and the review card asks for stars                                                                | [ ] | [ ]   |
| D14 | Review: stars are required, the comment is optional (up to 500 characters); after sending, "Your review" shows and it can't be sent twice | [ ] | [ ]   |
| D15 | The technician's rating on their profile includes the new review                                                                          | [ ] | [ ]   |
| D16 | Another customer opening this booking link sees "We couldn't find this booking"                                                           | [ ] | [ ]   |

### 8. Technician profile (`/technicians/:id`), customer

| ID  | Check                                                                                   | PC  | Phone |
| --- | --------------------------------------------------------------------------------------- | --- | ----- |
| T1  | Name, "NID checked by Karigor", area, rating, jobs done and experience                  | [ ] | [ ]   |
| T2  | Services with only this person's skills; working days and hours                         | [ ] | [ ]   |
| T3  | Reviews with stars, comment, service, date and the customer's short name ("Nusrat J.")  | [ ] | [ ]   |
| T4  | A new technician says "No reviews yet"; no phone number or exact location anywhere      | [ ] | [ ]   |
| T5  | A wrong id, or a technician who is still waiting, shows "We couldn't find this karigor" | [ ] | [ ]   |

### 9. My profile (`/tech/profile`), technician

Use a new technician account for 9 and the admin checks in 13.

| ID  | Check                                                                                              | PC  | Phone |
| --- | -------------------------------------------------------------------------------------------------- | --- | ----- |
| TP1 | A new technician sees an empty profile and that it needs saving                                    | [ ] | [ ]   |
| TP2 | Choose 1 to 3 services; each chosen service needs at least one skill                               | [ ] | [ ]   |
| TP3 | Area, map pin (tap or "Use my location") and travel distance 5, 10 or 15 km                        | [ ] | [ ]   |
| TP4 | Working days and hours; an end time before the start time is refused                               | [ ] | [ ]   |
| TP5 | Mistakes show "Some details need fixing" and red messages at the right fields                      | [ ] | [ ]   |
| TP6 | Save shows "Profile saved." and the status "Waiting for approval"                                  | [ ] | [ ]   |
| TP7 | NID photo: JPG or PNG up to 5 MB is accepted; a PDF or a big file is refused                       | [ ] | [ ]   |
| TP8 | After the admin rejects, the reason shows; saving again or a new NID photo puts it back to waiting | [ ] | [ ]   |
| TP9 | After approval the page says so and jobs can come in                                               | [ ] | [ ]   |

### 10. My jobs (`/tech/jobs`), technician

| ID  | Check                                                                                                     | PC  | Phone |
| --- | --------------------------------------------------------------------------------------------------------- | --- | ----- |
| J1  | A technician who is not approved yet sees "Not approved yet."                                             | [ ] | [ ]   |
| J2  | Tabs: New requests, Upcoming, Done, each with a friendly empty message                                    | [ ] | [ ]   |
| J3  | A customer books you: the request shows under New requests (refresh the page; note if it comes by itself) | [ ] | [ ]   |
| J4  | Each job shows the service, area and distance, time and rough price; "Right now" for emergencies          | [ ] | [ ]   |
| J5  | "Accepting jobs" switch off: you no longer appear in customers' top 3; switch on: you appear again        | [ ] | [ ]   |

### 11. Job details (`/tech/jobs/:id`), technician

| ID  | Check                                                                                                                            | PC  | Phone |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| JD1 | Before accepting: the problem summary, photos, rough price, the area pin and the customer's short name; no full address or phone | [ ] | [ ]   |
| JD2 | "Can you do this job?": Accept, or Reject with a confirm pop-up                                                                  | [ ] | [ ]   |
| JD3 | After accepting: full address, the customer's phone with a Call button, and the chat                                             | [ ] | [ ]   |
| JD4 | Buttons go in order: "I'm on the way", then "I've arrived", then "Finished the work?"                                            | [ ] | [ ]   |
| JD5 | Finishing needs the final price in taka                                                                                          | [ ] | [ ]   |
| JD6 | Accepting a second job at the same time (within 2 hours) is refused with a clear message                                         | [ ] | [ ]   |
| JD7 | When the customer cancels, the job shows "Cancelled" here without refreshing                                                     | [ ] | [ ]   |
| JD8 | Done jobs show the final price; the phone is hidden again                                                                        | [ ] | [ ]   |
| JD9 | Another technician opening this job link sees "We couldn't find this job"                                                        | [ ] | [ ]   |

### 12. Dashboard (`/admin`), admin

| ID  | Check                                                                                   | PC  | Phone |
| --- | --------------------------------------------------------------------------------------- | --- | ----- |
| A1  | Customers (with new this week), technicians (taking jobs), bookings today (emergencies) | [ ] | [ ]   |
| A2  | "Waiting for approval" with "Review now" goes to Technicians                            | [ ] | [ ]   |
| A3  | Bookings this month by status, in job order, and by service; the totals add up          | [ ] | [ ]   |
| A4  | After a new booking, the numbers go up (refresh)                                        | [ ] | [ ]   |

### 13. Technicians (`/admin/technicians`), admin

| ID  | Check                                                                              | PC  | Phone |
| --- | ---------------------------------------------------------------------------------- | --- | ----- |
| AT1 | Tabs Waiting, Approved and Rejected with counts                                    | [ ] | [ ]   |
| AT2 | Each shows the name, phone, services, skills, area, experience and hours           | [ ] | [ ]   |
| AT3 | "View NID photo" opens the photo (the link stops working after 5 minutes)          | [ ] | [ ]   |
| AT4 | A technician without an NID photo can't be approved (it says the photo is missing) | [ ] | [ ]   |
| AT5 | Approve moves them to Approved; they now appear in customers' top 3                | [ ] | [ ]   |
| AT6 | Reject needs a reason (5+ characters); the technician sees it on their profile     | [ ] | [ ]   |

### 14. Services and prices (`/admin/catalog`), admin

| ID  | Check                                                                                               | PC  | Phone |
| --- | --------------------------------------------------------------------------------------------------- | --- | ----- |
| C1  | "Services and prices" and "Safety tips" tabs open                                                   | [ ] | [ ]   |
| C2  | Rename a service (also the Bangla name); switch a service off: it disappears from Get help and Home | [ ] | [ ]   |
| C3  | Add a skill, rename it, remove it; removing a skill in use is refused with a reason                 | [ ] | [ ]   |
| C4  | Add a price item; the highest price below the lowest is refused                                     | [ ] | [ ]   |
| C5  | Change a price: a new problem check shows the new price; old results keep the old one               | [ ] | [ ]   |
| C6  | Give a price item a quick pick: it shows on the quick path; clearing it removes it                  | [ ] | [ ]   |
| C7  | Edit safety steps (1 to 8): a new emergency check shows the new steps                               | [ ] | [ ]   |
| C8  | Put everything you changed back as it was                                                           | [ ] |       |

### 15. Bookings and users (`/admin/bookings`), admin

| ID  | Check                                                                                                                                                   | PC  | Phone |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| U1  | All bookings, newest first, 20 a page with next and previous pages                                                                                      | [ ] | [ ]   |
| U2  | Filter by status; search by a name, a phone or a booking number                                                                                         | [ ] | [ ]   |
| U3  | Users tab: filter customers or technicians, blocked; search by name, phone or email                                                                     | [ ] | [ ]   |
| U4  | Block a customer who is logged in elsewhere: their next action fails with a "blocked" message, live chat stops, and after a refresh they are logged out | [ ] | [ ]   |
| U5  | Unblock: they can log in again                                                                                                                          | [ ] | [ ]   |
| U6  | Admin accounts can't be blocked                                                                                                                         | [ ] | [ ]   |

### 16. The whole story, start to finish

Do this once on a computer and once on a phone, with two people side by side.

| ID  | Check                                                                                                   | PC  | Phone |
| --- | ------------------------------------------------------------------------------------------------------- | --- | ----- |
| S1  | A new customer signs up, writes a problem, gets the result, books the best karigor                      | [ ] | [ ]   |
| S2  | The technician accepts; they chat; on the way, arrived, work done with the price                        | [ ] | [ ]   |
| S3  | The customer sees every step live, then leaves a review; it shows on the public profile                 | [ ] | [ ]   |
| S4  | A new technician signs up, fills the profile and NID; the admin approves; the technician gets a booking | [ ] | [ ]   |
| S5  | Emergency story: gas smell, safety steps first, a gas fitter right now, booked                          | [ ] | [ ]   |
| S6  | The technician says no; the customer books another of the top 3 for the same problem                    | [ ] | [ ]   |

## Bugs found

| #   | Check ID | What I did | What happened | What should happen | PC / Phone | Fixed? |
| --- | -------- | ---------- | ------------- | ------------------ | ---------- | ------ |
| 1   |          |            |               |                    |            |        |
| 2   |          |            |               |                    |            |        |
| 3   |          |            |               |                    |            |        |
| 4   |          |            |               |                    |            |        |
| 5   |          |            |               |                    |            |        |

## Sign-off

| Tested on              | Device and browser | Date | Result |
| ---------------------- | ------------------ | ---- | ------ |
| Computer               |                    |      |        |
| Phone (real or online) |                    |      |        |
