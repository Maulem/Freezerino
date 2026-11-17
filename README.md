# Freezerino

The family's freezer list (Andréia and Zé): what's on each shelf and in each drawer, how many,
when each package went in and when it expires. Also a shared shopping list.
Mobile web app in Portuguese, meant to be added to the phone's home screen.

- **Page:** static HTML/CSS/JS, hosted on GitHub Pages.
- **Data:** Firebase Firestore (São Paulo), synced live between phones, with an offline cache.
- **Login:** one shared family account (`familia@freezerino.app`) in Firebase Auth; the app only asks for the password.
  The rules in `firestore.rules` allow reads and writes for that account's UID only.

## Features

- Two freezers (Freezer Andréia, Freezer Zé), each with its own shelves and drawers.
- One dated entry per package; "−" always takes out the oldest one.
- Freezer time per food: the name turns yellow with less than half of it left, red with less than 20%.
  A box at the top counts what's expiring and can filter the list to just those foods.
- Shopping list tab; foods with a minimum ("Comprar quando tiver menos de") are added to it automatically.
- Opens without internet: a service worker (`sw.js`) keeps a copy of the app, and Firestore keeps the data offline.
  Changes made offline sync when the connection comes back.
- Expiry notifications: each phone turns them on with the bell at the top. Every day at 9:00 (Brasília) a GitHub
  Actions job checks both freezers and notifies when a food passes half of its freezer time, gets under 20% or expires
  (each step once per package).
- Daily backup of all the data to the private repo `Maulem/Freezerino-backup` (git history keeps every day).

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The app (Freezer, Compras, Prateleiras tabs) |
| `store.js` | Firebase access; on `localhost/?demo` it uses fake in-memory data for testing |
| `seed.js` | The original paper list, loaded once on the first login |
| `firestore.rules` | Firestore access rules (paste into Firestore → Rules) |
| `manifest.json`, `icons/` | Home screen icon and name |
| `sw.js` | Service worker: offline copy of the app, shows notifications |
| `scripts/daily.mjs`, `.github/workflows/daily.yml` | Daily job: expiry notifications + backup |

## Run locally

```bash
python -m http.server 5173 --directory .
```

Then open http://localhost:5173 (or http://localhost:5173/?demo for fake data, no login).

## Daily job setup (one time)

Repository secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where it comes from |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project settings → Service accounts → Generate new private key (paste the whole JSON) |
| `BACKUP_TOKEN` | Fine-grained GitHub token with *Contents: read and write* on `Maulem/Freezerino-backup` only |

The public Web Push key (Firebase Console → Project settings → Cloud Messaging → Web Push certificates) goes in
`VAPID_KEY` in `store.js`. To send a test notification: Actions → Daily check → Run workflow → mode `test`.

To restore from a backup, write the JSON files back into Firestore with the Admin SDK (same service account).

## Change the family password

1. Firebase Console → Authentication → Users: delete `familia@freezerino.app` and add it again with the new password.
2. Copy the new user's UID into `firestore.rules` (the `isFamily` function) and publish the rules in Firestore → Rules.
3. Anyone still logged in is sent back to the login screen and signs in with the new password.

The food, shelves and shopping list are stored in Firestore, not in the account, so nothing is lost.

© NKO Industries
