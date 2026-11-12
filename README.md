# Mavuno Cooperative Records

Mavuno (Swahili for “harvest”) is a mobile-friendly, offline-ready records app for a farming cooperative in Nakuru. Its photographic identity and crop images are bundled locally, so the interface does not depend on third-party image services.

Record a member's produce intake with the receiving store, quantity, and agreed price. Mavuno adds the produce to that store's stock and records the farmer payout as a cash-book expense. Stock adjustments can record other receipts or dispatches.

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

Farmer intake payouts are recorded as expenses in the cash book. Other cash-book entries can be added as income or expenses. Stock adjustments use positive quantities for receipts and negative quantities for dispatches, and recorded stock cannot be reduced below zero.

## Photography credits

The app bundles the following photographs. Each remains under its stated Creative Commons license; the square Mavuno app mark is a crop of the sorghum photo.

| Asset | Photograph / author | License |
| --- | --- | --- |
| `public/images/hero-harvest.jpg` | [Harvesting in Chikhwawa Malawi](https://commons.wikimedia.org/wiki/File:Harvesting_in_Chikhwawa_Malawi.jpg), Loes van der Pluijm; resized for web | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/images/maize-farmer.jpg` | [Maize farmer](https://commons.wikimedia.org/wiki/File:Maize_farmer.jpg), Wilhelm Nomu Kutah; resized for web | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/images/beans-harvest.jpg` | [Harvested runner bean seeds](https://commons.wikimedia.org/wiki/File:-2020-09-30_Harvested_runner_bean_seeds_ready_for_next_years_crop,_Trimingham.JPG), Kolforn; resized for web | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/mavuno-icon.jpg` | [Sorghum crop Chinawal 01](https://commons.wikimedia.org/wiki/File:Sorghum_crop_Chinawal_01.jpg), ABHIJEET; cropped square and resized for the app mark | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `public/images/sorghum-field.jpg` | [A crop of sorghum](https://commons.wikimedia.org/wiki/File:A_crop_of_sorghum_(Sorghum_bicolor)_-_geograph.org.uk_-_1070422.jpg), Evelyn Simak | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
