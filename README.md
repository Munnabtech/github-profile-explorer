# GitHub Profile Explorer

React + Vite + Tailwind v4 + shadcn/ui. Calls GitHub's public REST API straight from the browser.

## Setup

```bash
npm install
npx shadcn@latest init          # pick any base color; accept the defaults
npx shadcn@latest add button input card badge skeleton sheet select tabs avatar alert dialog
npm run dev
```

If `init` asks to overwrite `src/index.css`, say yes. The README styles live in `src/readme.css`, so nothing is lost.

## Put it on GitHub

```bash
git init && git add . && git commit -m "GitHub Profile Explorer"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Deploy free on GitHub Pages

1. In `vite.config.ts` add `base: "/<repo>/"`.
2. `npm run build`, then publish the `dist` folder (for example with the `gh-pages` package or a GitHub Actions Pages workflow).

Shareable links work as `?user=torvalds`.
