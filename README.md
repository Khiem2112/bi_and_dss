# Flight Delay BI & DSS Dashboard Demo

Vite + React + TypeScript implementation derived from `../dashboard_design_v2.md`.

## Run locally

```powershell
npm install
npm run dev
```

Production check:

```powershell
npm run build
npm run lint
npm test
```

`npm test` chạy các contract test cho KPI eligibility/delay, sample scaling, global filters, zero-result, table search/sort, component help và quy tắc không fallback âm thầm.

## Architecture

```text
Page/component → domain hook → DashboardRepository → MockDashboardRepository
                                                └→ ApiDashboardRepository (placeholder)
```

- Components never import mock JSON or call endpoints directly.
- Page navigation uses React Router (`HashRouter`) with `/overview`, `/spatial`, `/temporal`, and `/prediction` routes.
- Mock payloads live in `public/mock-data/` and carry illustrative/schema/rule metadata.
- Swap repository composition in `src/repositories/index.ts` when a governed API is ready.
- `styles.css` is the original demo stylesheet with an appended React v2 layer.

## Decision-safety note

All displayed values are illustrative. Sample thresholds, verified airport geography, calibrated model output, and the priority rule remain unapproved; the UI therefore keeps hotspot/priority states uncalibrated or locked.

Implementation evidence, browser screenshots and report-safe limitations are recorded in [`../dashboard_readiness_report.md`](../dashboard_readiness_report.md).
