# pwa-cocktailguide

Augy Studios PWA sites cocktailguide, served at <https://cocktails.uwuapps.org/>

## Before every deploy

Bump `VERSION` at the top of `sw.js`. The browser only sees a new version when that file changes, so without the bump nobody gets the update bar and returning visitors keep the old site.

## TheCocktailDB key

Searches go through `/api/search`, a Vercel serverless function that reads `COCKTAILDB_API_KEY`. Set it under Project Settings > Environment Variables; the function returns a 500 if it is missing. For local development, copy `.env.example` to `.env` and run `vercel dev` (a plain static server cannot run `/api`).
