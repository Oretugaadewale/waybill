# Waybill

Shipment tracking and payments for cross-border logistics between Nigeria, the US, the UK and Canada.

I built Waybill as a portfolio project, drawing on how we run operations at eShopAfrica, an international logistics company in Lagos. Customers there ask one question more than any other: _where is my package?_ Waybill answers it, and over the next stages it grows into the full flow: booking, quoting, admin tools and paying with Paystack.

**Live demo:** _coming with the first deploy_
**Status:** Stage 1 of 6 complete. The app runs on invented sample data for now.

![Tracking page on desktop](docs/screenshots/desktop-tracking.png)

## Try it

Open the demo and enter any of these sample tracking numbers. Each one is at a different stage of its journey.

| Tracking number | Route               | Stage            |
| --------------- | ------------------- | ---------------- |
| `WB-6604-UK`    | Abuja to Manchester | Booked           |
| `WB-5310-US`    | Lagos to Atlanta    | Picked up        |
| `WB-3150-CA`    | Lagos to Toronto    | In transit       |
| `WB-2087-NG`    | London to Lagos     | At customs       |
| `WB-4021-NG`    | Houston to Lagos    | Out for delivery |
| `WB-1042-US`    | Lagos to Houston    | Delivered        |

You can type the number the way customers really do: `wb 1042 us` and `WB1042US` both work.

## What Stage 1 includes

- **Tracking search** that accepts messy input, explains mistakes in plain language and sends you to one canonical URL per shipment.
- **A tracking result designed like a printed waybill:** big hub codes for the route, a six-step progress bar, the shipment facts in ruled boxes, and a full scan history with times shown in the local time of each scan.
- **A helpful not-found page** with the correct number format and sample numbers.
- **Mobile first.** Most of our customers track on mid-range Android phones, so every screen is designed for 360px first.
- **Accessible:** a skip link, labelled form fields, errors announced to screen readers, a real `progressbar` with readable values and `aria-current` on the active step.

## Tech stack

| Area      | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js 16 (App Router, Server Components, Cache Components) |
| Language  | TypeScript, strict mode                                      |
| Styling   | Tailwind CSS 4, self-hosted IBM Plex fonts                   |
| Testing   | Vitest and React Testing Library                             |
| Quality   | ESLint, Prettier, GitHub Actions CI                          |
| Hosting   | Netlify                                                      |

Tracking pages for known shipments are prerendered at build time with `generateStaticParams`. Unknown numbers render the not-found page.

## Run it locally

You need Node.js 22 or later.

```bash
git clone https://github.com/Oretugaadewale/waybill.git
cd waybill
npm install
npm run dev
```

Then open http://localhost:3000.

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start the development server |
| `npm test`          | Run the test suite           |
| `npm run lint`      | Lint the code                |
| `npm run typecheck` | Type check the whole project |
| `npm run build`     | Build for production         |

Every push to `main` runs formatting, lint, type checks, tests and a production build in CI.

## Project structure

```
src/
  app/                    Routes: home, /track/[trackingNumber], not-found pages
  components/             UI components and their tests
  lib/shipments/          Shipment types, sample data and tracking logic
  fonts/                  Self-hosted IBM Plex Sans and Mono
```

The tracking logic in `src/lib/shipments/tracking.ts` is plain TypeScript with no framework code, so it is easy to test and will stay the same when the data moves into a database.

## Roadmap

| Stage | Scope                                                              | Status  |
| ----- | ------------------------------------------------------------------ | ------- |
| 1     | Project setup and public tracking page                             | Done    |
| 2     | Supabase database, Row Level Security and admin login              | Next    |
| 3     | Admin dashboard to create shipments and post tracking updates      | Planned |
| 4     | Booking form and a quote calculator by weight, route and service   | Planned |
| 5     | Paystack test payments with server-side verification and a webhook | Planned |
| 6     | End-to-end tests, final deploy and a write-up of the decisions     | Planned |

## About

Built by [Adewale Oretuga](https://adewale-oretuga.netlify.app), a frontend engineer in Lagos working with React, Next.js and TypeScript. All shipments, names and tracking numbers in this project are invented.

## Licence

[MIT](LICENSE)
