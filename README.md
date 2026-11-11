# Mavuno Cooperative Records

Mavuno (Swahili for “harvest”) is a mobile-friendly, offline-ready records app for a farming cooperative in Nakuru. It records farmer crop sales, stock by crop and storage location, and cash income and expenses in Kenyan shillings.

## Run locally

Requirements: Node.js 22.22.2+, 24.15+, or 26+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Run `npm test` for focused domain tests and `npm run build` to create the production bundle.

## Run in a container

```sh
docker compose up --build
```

Then open `http://localhost:8080`. The same image can be run on a local server or a cloud container service.

## Git and CI

Track changes with Git and push the repository to GitHub. The GitHub Actions workflow in `.github/workflows/ci.yml` runs tests, builds the app, and builds the Docker image on pushes to `main` and on pull requests.

## Offline and data notes

After the app has been opened online once, its service worker caches the app shell and loaded assets for offline use. Service workers require a secure context (HTTPS, or localhost during development). Sales, inventory, and cash-book data are stored in the browser's local storage on the current device; they are not synchronized to other devices or backed up to a server. Do not treat this starter app as a shared accounting system until authentication, a secure backend, synchronization, and backup/restore have been added.

When recording a sale, the sale value is automatically added as income in the cash book. Stock adjustments use positive quantities for receipts and negative quantities for dispatches, and recorded stock cannot be reduced below zero.
