# BCN Engineering Job Market

An interactive Barcelona engineering job market explorer with salary analytics, filters, sortable tables, and drill-through job postings.

Live site: [gabonio.github.io/bcn-jobmarket](https://gabonio.github.io/bcn-jobmarket/)

## What it includes

- Overview of postings, companies, crafts, modalities, and compensation
- Compensation ranges and monthly posting volume
- Company, role, craft, level, modality, location, and currency filters
- Clickable charts with drill-through job-post listings
- Search and sortable columns in drill-through tables
- Grouped individual-contributor and management levels
- Microsoft Clarity usage analytics

## Data source

The dashboard visualizes job posts shared in BCN Engineering’s public Slack channel `#hiring-job-board`.

See [BCN Engineering](https://bcneng.org/) for the community and source context. The app loads the current public data source when available and falls back to a bundled snapshot if the live request fails.

## Run locally

```bash
npm install
npm run dev
```

The app is available at `http://127.0.0.1:5173/bcn-jobmarket/`.

## Validate changes

```bash
npm test
npm run build
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`, which builds the Vite app and deploys the `dist` artifact to GitHub Pages.
