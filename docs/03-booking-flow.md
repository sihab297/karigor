# Booking Flow

## Status diagram

```
                 ┌──────────► rejected        (technician says no)
                 │
 requested ──────┼──────────► cancelled       (customer cancels)
                 │
                 ▼
             accepted ──────► cancelled       (customer cancels before "on the way")
                 │
                 ▼
            on_the_way
                 │
                 ▼
              arrived
                 │
                 ▼
             completed ─────► customer can leave one review
```

## Who can change what

| From         | To           | Who        | Rule                                                      |
| ------------ | ------------ | ---------- | --------------------------------------------------------- |
| (new)        | `requested`  | Customer   | Books one of the top 3 technicians                        |
| `requested`  | `accepted`   | Technician |                                                           |
| `requested`  | `rejected`   | Technician | Customer is told and can pick another of the top 3        |
| `requested`  | `cancelled`  | Customer   | Any time before it is accepted                            |
| `accepted`   | `cancelled`  | Customer   | Only before the technician is on the way; reason required |
| `accepted`   | `on_the_way` | Technician |                                                           |
| `on_the_way` | `arrived`    | Technician |                                                           |
| `arrived`    | `completed`  | Technician | Must enter the final price paid in cash                   |

Any other change is refused by the server with an error. Every change is saved in
`statusHistory` with the time and the person who made it.

## Rules

- **Address:** the technician sees only the area and map pin until they accept. The full address
  (house, road, flat) is shown after accepting.
- **Chat:** opens when the booking is `accepted` and stays open until `completed`. After that it is
  read-only.
- **Live updates:** the customer sees status changes right away through Socket.IO, without
  refreshing the page.
- **Review:** only after `completed`, only by that customer, only once per booking.
- **Technician stats:** when a booking is `completed`, the technician's `jobsDone` count for that
  service goes up by one. When a review is added, their average rating is updated.
- **Double booking:** a technician cannot accept two bookings at the same time slot.
