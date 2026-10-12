# Design Guide

The look we chose is **"Turmeric"**: warm, friendly and easy to read, made for people in Dhaka
using a phone. Every page should follow this guide so the site feels like one product.

The colors, fonts and corner size live in `client/src/index.css` (the `@theme` block). Change
them there and the whole site updates.

## Colors

| Name (Tailwind class)              | Color                 | Use it for                                                         |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `turmeric`                         | `#F2B33D`             | Main buttons and the logo. Always with dark text.                  |
| `turmeric-dark`                    | `#E0A02A`             | Main button when hovered                                           |
| `turmeric-soft`                    | `#FDF0D2`             | Chosen options, small tags (like service names)                    |
| `tea`                              | `#2A2118`             | Text, headings, borders of focused fields                          |
| `muted`                            | `#6B6257`             | Helper text, less important text                                   |
| `pond`                             | `#2F6F62`             | Links, the keyboard focus ring, "done" ticks, switches that are on |
| `pond-soft`                        | `#E3F0EC`             | Good news boxes, like "Approved"                                   |
| `paper`                            | `#F6F6F3`             | Page background                                                    |
| `line`                             | `#E6E1D8`             | Borders of cards and fields                                        |
| `alert`, `alert-soft`, `alert-ink` | `#B42318` and friends | Errors and emergencies only. Never for decoration.                 |

Rules:

- White text on turmeric is hard to read, so turmeric always gets `text-tea`.
- Red means a problem or danger. Don't use it for anything else, so emergencies stand out.

## Fonts

- **Headings:** Baloo Da 2 (`font-heading`, used automatically by `h1`–`h3`).
- **Everything else:** Hind Siliguri (`font-body`, the default).

Both support Bangla properly. They load from Google Fonts in `client/index.html`.

## Shapes and sizes

- **Corners:** gently rounded, `rounded-box` (10px) for buttons, fields and cards.
- **Touch size:** buttons and fields are 48px tall (`h-12`), easy to tap with a thumb.
- **Phone first:** design for a 390px wide screen, then let it grow. Forms sit in a column up to
  `max-w-md`.
- **Icons:** simple line icons from `lucide-react`, about 20px. No emoji.
- **Light mode only** for now.

## Ready-made pieces

Use these instead of writing new styles. They live in `client/src/components/`.

| Component       | What it is                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------- |
| `Logo`          | The ক mark with "Karigor" and "কারিগর" (temporary logo)                                      |
| `Button`        | Main (`primary`) or outlined (`secondary`), with a loading spinner                           |
| `TextField`     | Label, input, helper text and error message, all linked for screen readers                   |
| `PasswordField` | `TextField` with a show/hide eye button                                                      |
| `Alert`         | Red message box for errors that are not about one field                                      |
| `AuthLayout`    | The page frame used by log in and sign up                                                    |
| `AppLayout`     | Header, menu and log out for every page behind login                                         |
| `Switch`        | On/off switch, like "Taking jobs"                                                            |
| `Modal`         | Pop-up over the page: closes with ✕, Escape or a click outside, and puts keyboard focus back |

`Button` also has a `danger` style (red) for actions that can't be undone easily, like rejecting
a technician. Use it only for those.

Admin pieces live in `client/src/components/admin/`: `TechnicianReviewCard` and `NidPhotoDialog`.

Pieces made for the technician profile, in `client/src/components/profile/`, can be reused
elsewhere: `StepCard` (numbered section that turns green when done), `ServicePicker` (services and
skill chips), `LocationPicker` (map with a draggable turmeric pin), `DayPicker` (Saturday to
Friday), `NidUpload` (photo upload box with preview) and `StatusBanner`.

## Patterns

- **Selected things** (services, skills, days) get a dark border and a turmeric fill, plus a
  tick, so they don't rely on color alone.
- **Long forms** are split into numbered steps on one page, with a save bar fixed to the bottom.
- **Maps** use OpenStreetMap through Leaflet, with the turmeric pin. Customers only ever see a
  technician's area name, never their exact pin.

## Words

Write the way a helpful person talks. Short sentences, everyday words.

| Instead of              | Write                                                         |
| ----------------------- | ------------------------------------------------------------- |
| "Invalid input"         | "That number doesn't look right. Try 01712345678."            |
| "Authentication failed" | "Wrong phone/email or password."                              |
| "Submit"                | Say what happens: "Log in", "Create account", "Book Rahim"    |
| "No data"               | "No bookings yet. When you book a karigor, it shows up here." |

Avoid "seamless", "empower", "unlock", and tech words users don't know.

## Accessibility checklist

- Every field has a visible label.
- Errors appear under the field, in words, not only as a red border.
- Everything works with the keyboard; the focus ring (pond green) is always visible.
- Text and background have strong contrast (turmeric + tea passes).
