# Cocktail Guide

A small installable web app for looking up cocktails by name. Search for a drink and it shows the photo, ingredients with measures, and method. Drinks you've already viewed stay cached, so they still open offline.

Live at <https://cocktails.uwuapps.org/>. Part of UwU Apps by Augy Studios.

Recipe data and photos come from [TheCocktailDB](https://www.thecocktaildb.com/).

## Repository layout

| Path | What it is |
| --- | --- |
| [`main-site/`](main-site/) | The site itself: static HTML/CSS/JS, the service worker, and the `/api/search` Vercel function. Setup, local development and deploy steps are in [its README](main-site/README.md). |
| [`uwuapps-theme.md`](uwuapps-theme.md) | Shared UwU Apps theme spec: 7 brand colours × light/dark mode, plus the time-based mode. `main-site/js/theme.js` follows it. |
| [`uwuapps-retrofit-time-mode.md`](uwuapps-retrofit-time-mode.md) | Prompt used to add the time-based mode on top of an existing light/dark toggle. |
| [`update-bar-spec.md`](update-bar-spec.md) | Spec for the "new version is ready" bar and the service worker behaviour behind it. `main-site/js/update.js` and `main-site/sw.js` follow it. |

The three spec files are shared across UwU Apps projects. Edit them only when the canonical version changes.

## Quick start

```sh
cd main-site
cp .env.example .env
vercel dev
```

See [main-site/README.md](main-site/README.md) for details.

## Contributing

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before opening an issue or pull request.

## License

[MIT](LICENSE) © 2026 Augy Studios
