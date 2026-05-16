# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## New Listing Notifier

An hourly email alert for new house listings in watched towns, powered by GitHub Actions + Resend.

**Watched towns:** Pelham (10803), Bronxville (10708), Irvington (10533)

**How it works:**
1. GitHub Actions runs `scripts/notify-new-listings.js` every hour (cron `0 * * * *`)
2. Fetches current for-sale listings from the US Real Estate Listings API on RapidAPI
3. Compares against `data/seen-listings.json` (persisted via git commit)
4. Sends a styled HTML email via Resend for each new listing
5. Commits the updated seen-listings file back to main

**First run:** If `seen-listings.json` is empty, the script saves all current listings without emailing — prevents an avalanche of notifications.

**Required GitHub Secrets:**
- `RAPIDAPI_KEY` — US Real Estate Listings API key
- `RESEND_API_KEY` — Resend email API key
- `NOTIFY_EMAIL_TO` — Recipient email address(es), comma-separated for multiple (e.g. `ali@domus.com,ed@domus.com`)

**To add more towns:** Edit `WATCH_ZIPS` in `scripts/notify-new-listings.js` and add a `{ zip: "XXXXX", town: "Name" }` entry. Also update the footer text in `buildEmailHTML`.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
