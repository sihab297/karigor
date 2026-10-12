# Data Lists

The starting data lives in `server/src/data/`. The AI reads it, and `npm run seed -w server` copies
it into MongoDB so the admin can edit it later. The seed also creates the admin account and the
test accounts listed in the main README.

| File               | What is in it                                                        |
| ------------------ | -------------------------------------------------------------------- |
| `services.json`    | The 7 services, the skills for each, and the price list              |
| `safety-tips.json` | Safety steps for 4 emergency types, and the 999 number               |
| `areas.json`       | 22 Dhaka areas with map positions (for test technicians and the map) |

`npm test -w server` checks this data automatically: no duplicate ids, every price item linked to
a real skill, min price ≤ max price, and every area inside Dhaka.

## Services and skills

| Service     | Skills                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Plumber     | tap repair, pipe leak, flush/cistern, blocked drain, basin/commode fitting, water pump, geyser, shower  |
| Electrician | ceiling fan, switch and socket, light fitting, wiring and new points, IPS/UPS, main switch and breaker  |
| Painter     | room painting, outside wall, damp treatment, touch-up, door/window/grill                                |
| Gas Fitter  | stove and burner repair, gas leak, gas line shifting, LPG cylinder setup, stove installation            |
| AC Repair   | servicing, gas refill, installation and removal, water leak, not cooling                                |
| Carpenter   | door lock, door and hinge, furniture repair, furniture assembly, curtain rod and shelf, kitchen cabinet |
| Cleaner     | full home deep clean, bathroom, kitchen, sofa and carpet, water tank                                    |

Each service (except AC Repair and Cleaner) also has a **"Visit and check"** price item, used when
the service is clear but the exact job is not.

## Before you use this data: please check

### Prices (`services.json`)

The prices are **sample numbers**. Before the demo:

1. Ask 2–3 local technicians what they normally charge for the common jobs.
2. Compare with the listed prices on Sheba.xyz.
3. Update `minPrice` and `maxPrice` in `services.json`.

Prices are labour only. Parts and paint are extra.

### Safety tips (`safety-tips.json`)

The tips follow common safety advice. Before the demo:

1. Compare them with Bangladesh Fire Service and Civil Defence guidance.
2. Change any line that does not match.
3. Never let the AI write safety tips. It only chooses which list to show.

### Areas (`areas.json`)

Map positions are approximate area centres, good enough for test data and distance sorting.
