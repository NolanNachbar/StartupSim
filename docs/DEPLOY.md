# Deploying Runway

The game is a static site: `npm run build` produces `dist/`. Nothing runs on a server.

## Cloudflare Pages (default)

1. Create a Pages project from the GitHub repo. Build command `npm run build`, output directory `dist`, Node 22 or newer.
2. Set environment variables (all optional):
   - `VITE_SITE_URL` the public address, for the social preview image URL, for example `https://example.com`
   - `VITE_ANALYTICS_DOMAIN` the domain registered with Plausible. When unset, no analytics script is included. Plausible sets no cookies and collects no personal data. If you turn it on, add `https://plausible.io` to `script-src` and `connect-src` in `public/_headers`
   - `VITE_ERROR_ENDPOINT` a URL that accepts a JSON POST of an error report. When unset, nothing is sent
3. `public/_headers` sets a strict content security policy, caching for hashed assets and a few safe defaults. Netlify reads the same file. For other hosts, copy the rules into their configuration.

Other hosts (Netlify, Vercel, GitHub Pages) work the same way: build, publish `dist/`.

## What an error report contains

The message and up to eight stack frames with origins, paths, queries and fragments removed, the sim version and the screen name. It never contains the seed, run data, storage contents or the user agent. At most five reports are sent per page load.

## Before the first public link

- Pick the name and domain (Nolan). The working title "Runway" appears in `index.html`, `public/og.png` (regenerate with `node scripts/make-og.mjs`), the footer text in `src/ui/shareCard.ts` and the board heading.
- Run `npm run verify` on the commit being deployed.
- Open the deployed site on a phone and play one run.
