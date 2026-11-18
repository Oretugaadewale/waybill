# The decisions behind Waybill

The [README](../README.md) says what Waybill does. This page explains why it works that way: the choices I made, what each one cost, and the bugs that changed my mind along the way.

## Where it comes from

I manage operations at eShopAfrica, an international logistics company in Ojota, Lagos. Two things shaped this project more than anything else.

First, the question we hear most is "where is my package?". Customers ask it on WhatsApp, on the phone and at the counter, often for a parcel that is moving exactly as planned. A clear tracking page answers it before anyone has to ask.

Second, most of our customers drop parcels off in person, and many would rather not book online. So Waybill is not built around a slick checkout. It's built around the staff who turn a booking into a shipment and post every scan along the way, with the customer pages as a clear window into that work.

## The tracking page

**It looks like a printed waybill.** Customers already know the paper label: tracking number, big airport codes, boxes of facts. Copying that layout made the page familiar to people who have never used a tracking site.

**Mobile first, for mid-range Android phones.** Most customers track on a phone, often on a slow connection. Every screen was designed at 360px first. The pages are server-rendered and cached, so a phone gets finished HTML instead of a loading spinner.

**It accepts the number the way people type it.** `wb 1042 us`, `WB1042US` and `WB-1042-US` all open the same page, which then has one canonical address. Telling a customer their number is "invalid" because of a missing dash is our fault, not theirs.

**Times are local to the scan.** A parcel scanned at 2:47 pm in Houston should say 2:47 pm, not the time in Lagos. Each scan is stored as UTC plus the offset of the place it happened on that date. That's one more column, but daylight saving and countries with several time zones (the US, Canada, Russia) come out right. Admins pick the city, and if the country has more than one time zone, they pick which.

## The database does the enforcing

**The rules live in Postgres, not just the forms.** Stages only move forward. Scans can't be in the future or out of order. Delivered and cancelled shipments are closed. Shipments are cancelled, never deleted. The admin forms check all of this for friendly messages, but the database checks it again in triggers, so the rules hold for any client: the dashboard, the SQL editor or a future script. The cost is writing each rule twice. The benefit is that no bug in the app can create a timeline a customer can't make sense of.

**Errors are written for people.** Each rule raises a plain-English message with SQLSTATE `P0001`, and the dashboard shows it word for word. So "Delivered shipments cannot take new scans" comes straight from the database, with no mapping table to keep in sync.

**Nobody can list the shipments.** The public can't read any table. The only public way in is one function that returns a single shipment for an exact tracking number. Tracking numbers are short, so letting anyone page through them would leak every customer's route and contents.

**Admins are added with SQL only.** There's no endpoint that makes someone an admin, so there's no endpoint to attack.

## Prices

**The price is always worked out on the server.** `calculateQuote()` is a pure function. The browser runs it to show the price as you type, and the server runs it again before saving a booking and again before charging. A price sent from the browser is never trusted. If the stored booking no longer matches what the customer was shown, Waybill refuses to charge rather than charge a different amount.

**Everything is in naira.** Paystack charges Nigerian accounts in naira, so every booking is priced in naira, including air freight from China. A real business would want the sender's currency for China shipments. I chose one currency that the payment provider handles end to end over a conversion step this demo couldn't do honestly.

**Zones come from time zone data, not a hand-kept list.** Air ships to over 240 countries. Rather than type each one into a zone, Waybill uses the region of each country's main time zone (Europe, Africa, Asia and so on), with the UK, Ireland, the US and Canada handled on their own. New countries fall into a sensible zone automatically.

## Payments

**Two signals, both verified.** Paystack reports a payment in two ways: by redirecting the customer back, and by calling a webhook. Waybill trusts neither on its own. The redirect only says which transaction to ask about. The webhook's HMAC-SHA512 signature is checked on the raw body, and then Waybill asks Paystack's API anyway. Both paths record the result idempotently, so whichever arrives second changes nothing. The webhook is what saves a payment when a customer closes the tab before coming back.

**A server key instead of the master key.** The simple route would be to give the app Supabase's service role key, which bypasses all security. I didn't want one leaked environment variable to expose every customer's details. So the app uses the public key like everyone else, and the payment functions also demand a separate server key that only Vercel holds. The database keeps only its SHA-256 hash, in a schema the public API can't see. It's more setup, but the blast radius of a leak is much smaller.

**Declined cards are noticed.** Paystack only calls the webhook when a payment succeeds. Without extra work, a declined card would leave the customer staring at an unchanged page. So when a booking page loads with a payment attempt still open, Waybill asks Paystack what happened and tells the customer their card was declined and they haven't been charged.

**Money is never lost track of.** If money arrives for a booking that no longer wants it, or a paid shipment is cancelled, the payment is kept and flagged "Refund needed" until staff mark it refunded. That covers a declined booking, a second payment, or a checkout tab left open overnight. Logistics businesses lose real money to refunds nobody remembered to make.

**The health check reports key shapes, never keys.** While setting up I pasted two keys into each other's boxes in Vercel. The fix was a status endpoint that reports each key's length, its first four characters and whether it has stray spaces, but never the key itself. It found the mistake in seconds, and it now also tells the tests which commit is live.

## Bugs that changed the code

Testing every flow by hand and then with automated tests turned up bugs I wouldn't have predicted. These are the ones that taught me something.

**Selects went blank after a form error.** In React 19, a form action resets the form after it runs. A controlled select on a page you reached by client-side navigation came back empty, so the country choice vanished after a failed submit. I now submit through a small `submitWithoutReset` helper that calls the action inside a transition instead.

**A helper in the wrong file broke two pages.** A function the server needed lived in a file marked `"use client"`, so `/quote` and `/book` failed on the server while working fine in development. Since then I start the production build locally before every push.

**The database returned an object where I expected a list.** Supabase returns a related row as an object, not an array, when the link is one to one. Every booking has at most one shipment, so a warning about a changed weight never appeared. Typing the result as either shape fixed it, and a test now covers both.

**Closing Paystack lost the booking.** A customer who paid straight from the booking form and then clicked Close on Paystack landed back on an empty booking form. Their booking was saved, but it looked lost, and they might have booked twice. Paystack accepts a `cancel_action` address, so Close now always returns to the customer's own booking page.

**The server and the browser disagreed about Hong Kong.** The browser tests failed on any uncaught error in the page, and that caught a hydration error on the quote and booking pages. Node's built-in country names call Hong Kong "Hong Kong SAR China", while Chrome calls it "Hong Kong". The same went for Macao, Palestine and the Falkland Islands. Because the server-rendered list didn't match, React threw away the server HTML and rebuilt both pages in every visitor's browser. The fix was a fixed table of country names that renders the same everywhere. Scans saved with the old names still work.

## How it's tested

The tests are layered so each layer checks what it's best at.

- **Unit and component tests** (Vitest and React Testing Library, about 115) cover the pure logic: tracking number parsing, time zone conversion, every pricing rule, form validation, and Paystack signature checks.
- **SQL rule checks** in [`supabase/tests`](../supabase/tests) run against the real database inside a transaction that is rolled back. They try the moves that must fail, such as a scan in the future, paying twice or paying the wrong amount, and confirm the database refuses them.
- **Browser tests** (Playwright) run on every push against the production build with sample data, at desktop and phone sizes. After every deploy and every morning, a second set checks the live site without saving anything. Among other things, it confirms Paystack is still in test mode, so a live key on the demo would fail loudly.
- **The full customer journey** (quote, book, pay on Paystack's test checkout, then the paid page) runs on the live site only when started by hand, because each run saves a real test booking.

Writing tests for a database you share with real data takes care. The live checks only read, and the one test that writes is opt-in and clearly labelled.

## What I would do next

- **Notify customers on WhatsApp.** That's where our customers already are, and a message at each stage would answer "where is my package?" before it's asked.
- **Pull scans from carriers.** Today staff post each scan by hand. DHL, Aramex and UPS all have tracking APIs that could post them automatically.
- **Real rates and currencies.** Live rate cards per carrier, and pricing in the sender's currency for shipments from China.
- **Refunds through Paystack's API.** Staff refund in the Paystack dashboard and then mark the booking. Doing it from Waybill would remove a step and a chance to forget.
- **An audit log and staff roles.** Every admin can do everything today. A growing team would need roles and a record of who changed what.
- **A real 404 status for missing shipments.** Pages that stream in send their status before they know a shipment is missing, so a wrong tracking number returns 200 with a `noindex` tag. That's harmless for search engines, but a correct status code would be cleaner.
