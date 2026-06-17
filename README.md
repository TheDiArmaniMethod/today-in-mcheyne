# Today in M'Cheyne

A static Vite React build of the Today in M'Cheyne Bible reading app.

## Commands

```bash
npm install
npm run build
npm run preview
```

The production build is emitted to `dist/` and can be deployed to Netlify, Vercel, Cloudflare Pages, or any static host.

## Static Data

- M'Cheyne plan: `public/data/reading-plan/mcheyne-plan.json`
- KJV Bible JSON: `public/data/bible/kjv/`
- WEB Bible JSON: `public/data/bible/web/`

The app defaults to KJV and stores the selected Bible version plus reading progress in `localStorage`.
