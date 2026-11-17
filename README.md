# ✦ Service Timer

Keep every church service on time, in every room.

Service Timer gives the operator a control console and gives every screen (the projector, a stage monitor, an overflow TV, a phone) the same live countdown. The screens stay in sync to the second, across rooms and across sites.

## What it does

- **Your own link.** Sign up, name your organisation and get `yourdomain/your-church`. Each location has its own display link (`/your-church/main`, `/your-church/overflow`). Screens need no login.
- **Multiple locations.** Each location runs its own live session, and several can run at the same time.
- **Templates.** Save an order of service once and reuse it every week.
- **Recurring events.** Link a template to a location, the days and a start time. On the day, it appears under *Today* ready to start in one click.
- **Service log.** Every segment records planned against actual time. The *Patterns* view shows which segments regularly run over.
- **Speaker cues.** The countdown turns amber at 2 minutes and orange at 1 minute. When time is up the screen flashes red and counts up the overtime. You can also send a message to the stage.
- **Operator controls.** `Space` pauses or resumes, `→` moves to the next segment, `←` goes back and `+`/`−` adds or removes a minute. You can jump to any segment, restart one, or adjust today's segments without changing the template.
- **Team.** Share a 6-character join code so your media team can sign up as operators.

## Why the timing is reliable (v1 vs v2)

v1 drove the projector by pushing a formatted string from the operator window once a second. Browsers slow down timers in background windows, so the projector froze or drifted whenever the operator clicked away. Also, every click on "Open Presentation Screen" added another update loop.

In v2 no screen is told the time. Each one gets the **state** of the session (which segment, when it started, how long it was paused) and works out the countdown itself, 10 times a second, against the **server's clock**. The offset to the server is measured with several round trips and checked again every 5 minutes. All timer actions run on the server and use the server's timestamp. As a result:

- A screen that sleeps, loses Wi-Fi or sits in a background tab is exactly right as soon as it wakes.
- Two screens in different buildings show the same second.
- If the realtime connection drops, screens keep counting from the last state they had. They reconnect on their own and also check for changes every 15 seconds.

## Stack

- React + Vite (single-page app), hosted on Vercel
- Supabase: Postgres with row-level security, Auth, Realtime
- All timer actions go through the `timer_action` Postgres function, so the server's clock is the single source of truth

### Data model

| Table | Purpose |
|---|---|
| `organisations` | Name, URL slug, time zone, join code |
| `org_members` | User ↔ organisation, role (`owner` / `admin` / `operator`) |
| `locations` | Rooms or sites, each with its own display URL |
| `templates` | Reusable orders of service (`segments` jsonb) |
| `events` | Recurring events: location + template + days + time |
| `sessions` | A live run: a snapshot of the segments plus timer state |
| `session_log` | One row per segment run: planned against actual |

## Run locally

```bash
npm install
cp .env.example .env   # Supabase URL + publishable key
npm run dev
```

## Deploy

The repo is linked to Vercel, so every push to `main` deploys. `vercel.json` sends all routes to the single-page app.

In Supabase → Authentication → URL Configuration, set **Site URL** to the production domain and add `https://<domain>/**` to the redirect URLs, so the sign-up confirmation emails link back to the app.

## Licence

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Free for non-commercial use with attribution.
