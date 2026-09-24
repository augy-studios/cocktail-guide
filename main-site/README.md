# pwa-cocktailguide

The Augy Studios Cocktail Guide PWA, served at <https://cocktails.uwuapps.org/>.

It's plain HTML, CSS and ES modules with no build step. Vercel serves the folder as static files, alongside one serverless function that proxies TheCocktailDB.

## Features

- **Search by name.** Shows the first match with its photo, ingredients and measures, and instructions.
- **Works offline.** Searches you've made and their photos are cached (the 60 most recent of each), so they still open without a connection.
- **Installable.** Has a web app manifest and icons, and a Digital Asset Links file for the Android app (`org.uwuapps.cocktailguide`).
- **Themes.** 7 brand colours, plus light, dark or time-based mode (light from 09:00 to 18:00). The choice is stored in `localStorage`.
- **Update bar.** When a new deploy has downloaded, a bar asks the reader to reload. Nothing reloads until they press Reload.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The only page. Also sets the theme in an inline script before first paint. |
| `script.js` | Entry module: wires up the theme modal and runs the search. |
| `js/theme.js` | Theme state and persistence ([spec](../uwuapps-theme.md)). |
| `js/update.js` | Registers the service worker and shows the update bar ([spec](../update-bar-spec.md)). |
| `js/ui.js`, `js/icons.js` | Modal helpers and inline SVG icons. |
| `style.css` | All styles, including the theme tokens. |
| `sw.js` | Service worker: precaches the app shell and caches responses by route (below). |
| `api/search.js` | Vercel function for `GET /api/search?s=<name>`. It forwards the query to TheCocktailDB so the API key stays on the server. |
| `404.html`, `404.css` | Not-found page. |
| `manifest.json`, `XCG-*.png`, `favicon.ico`, `images/` | PWA manifest, icons and store screenshots. |
| `.well-known/assetlinks.json` | Verifies the Android app for this domain. |
| `vercel.json` | Clean URLs, deployed to the `sin1` (Singapore) region. |

### Caching

| Request | Strategy | Cache |
| --- | --- | --- |
| Same-origin files | Cache first | `cocktailguide-<VERSION>`, replaced on each deploy |
| `/api/*` | Network first, falling back to the cache | `cocktailguide-api` |
| TheCocktailDB photos | Cache first | `cocktailguide-images` |
| Google Fonts | Cache first | `cocktailguide-fonts` |

The API and image caches hold up to 60 entries each and are kept across deploys. `/api/search` also sends `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`, so Vercel's edge answers repeat searches without running the function or using API quota.

## Local development

`/api` is a serverless function, so a plain static server can't run it. Use the Vercel CLI:

```sh
npm i -g vercel
cp .env.example .env   # or: vercel env pull .env
vercel dev
```

The service worker serves same-origin files cache first, so edits may not show up after a normal refresh. In DevTools, tick **Application → Service workers → Update on reload** (or **Bypass for network**) while you work.

## TheCocktailDB key

Searches go through `/api/search`, which reads `COCKTAILDB_API_KEY`. In production, set it under Project Settings > Environment Variables. If it's missing, the function returns a 500 instead of falling back to another key.

The value in `.env.example` is `1`, TheCocktailDB's public test key, which is only for development and non-commercial use. The function uses API v1 for the test key and v2 for premium keys.

## Deploying

The Vercel project's Root Directory is this folder (`main-site`).

### Before every deploy

Bump `VERSION` at the top of `sw.js`. The browser only sees a new version when that file changes, so without the bump nobody gets the update bar and returning visitors keep the old site.

If you add a file to the app shell, also add it to `ASSETS` in `sw.js`. Use `/` for the page, not `/index.html`, because `cleanUrls` redirects `/index.html` and the service worker can't answer a navigation with a cached redirect.
