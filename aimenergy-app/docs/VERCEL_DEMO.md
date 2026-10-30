# Publish the AimEnergy browser demo on Vercel

This configuration publishes the existing landing page and complete browser prototype. Model inference, demand scenarios, map, field assessments and exports run in the browser. It does not deploy the separate Node HTTP API or train models on Vercel.

## 1. Commit and push the deployment configuration

The Git repository root is `C:\Users\Dell\Downloads\AimEnergy\AimEnergy Project`. The application is its `aimenergy-app` subfolder. The configured remote is `https://github.com/Taffsigg/AimEnergy-Hackathon-2026-Project.git`.

The new files are deliberately left uncommitted. From PowerShell:

```powershell
Set-Location 'C:\Users\Dell\Downloads\AimEnergy\AimEnergy Project'
git status --short
git add aimenergy-app/vercel.json aimenergy-app/docs/VERCEL_DEMO.md
git diff --cached --stat
git commit -m "Configure Vercel static demo"
git push origin main
```

Review the staged summary before committing, particularly if you have already staged other work. Ensure the version you push includes `aimenergy-app/dist/index.html`, `planner.html`, their JavaScript/CSS, images and `dist/data` artifacts. These files are already prepared; no model build is needed for hosting them.

## 2. Import the GitHub repository

In Vercel, choose **Add New → Project**, connect GitHub if needed, and import **AimEnergy-Hackathon-2026-Project**.

Select **main** as the production branch and set **Root Directory** to:

```text
aimenergy-app
```

This is relative to the Git repository root. Do not enter a Windows path, the parent folder name, or `aimenergy-app/dist` here.

## 3. Confirm the settings and deploy

The `vercel.json` in the application folder supplies the deployment settings:

| Setting | Value |
|---|---|
| Framework | Other (`framework: null` in the file) |
| Install Command | `echo "Using prebuilt demo assets"` |
| Build Command | Empty: skip the build |
| Output Directory | `dist` |
| Clean URLs | Disabled, preserving explicit `.html` page links |
| Service-worker cache header | Revalidate `/sw.js` |

The install override prevents `npm install` from triggering the package's Python `prepare` script. The checked-in frontend, model JSON and geographic data are sufficient for the demo. Leave environment variables empty: the browser demo requires no API keys or database.

If you previously set conflicting project overrides, review them against the configuration. Choose **Deploy**, wait for a successful deployment, then open Vercel's returned URL. The deployment is not verified merely because this configuration file exists; inspect any failed build log rather than assuming publication succeeded.

Vercel's authoritative references: [build settings and nested root directories](https://vercel.com/docs/builds/configure-a-build), [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json).

## 4. Check the published demo

Use the returned deployment origin for all these checks:

1. `/` displays the landing page with the real Lamwo map and Orii Gangodye preview.
2. The hypothetical grain-mill toggle changes displayed energy from 1,570 to 2,065 kWh/month.
3. **Open prototype** opens `/planner.html` with the working map and planner.
4. `/planner.html#ai` opens the model lab; edit a profile and confirm the estimate changes.
5. `/planner.html#field` opens the field assessment; save an explicitly labelled demonstration response and export a report.
6. `/planner.html#metered` displays the separate Tanzania current diagnostic.
7. Check the phone layout and navigation.
8. If demonstrating offline operation, prepare the field pack on that published origin while online, wait for Ready, reload, then test on the actual presentation device. Browser policies and storage limits vary.

Only the contents of `dist` are served by this static configuration. Do not copy raw survey data, private operator records or credentials into that directory. Its existing public model/geography/evidence assets are intentionally downloadable.

## What works, and what is separate

| Capability | Static demo |
|---|---|
| Landing page and interactive preview | Included |
| Village explorer and demand scenarios | Included |
| Browser-side household model and model lab | Included |
| Field assessment, saved scenarios and exports | Included; stored on the visitor's device |
| Prepared offline pack | Included on supported browsers using HTTPS |
| Metered-current research exhibit | Included with source attribution and limitations |
| Node `/api/health`, `/api/model`, `/api/predict`, `/api/forecast` | Not deployed by this static configuration |
| Python preparation, retraining and raw-data acquisition | Local research tasks, not hosting steps |
| Shared accounts, centralized assessment storage or automatic synchronization | Not implemented |

No Python server or running local `npm start` process is needed once the static deployment succeeds. The separately documented API can be adapted/deployed later if an integration needs remote HTTP inference; the existing browser demo does not call it.

Localhost records do not automatically appear on the Vercel domain. Each origin has its own browser storage, and different preview deployment domains may have separate records. Reports can be exported as backups; do not assume an exported JSON file is automatically imported or synchronized.

The Tanzania exhibit remains noncommercial research under CC BY-NC 3.0. Public demo hosting does not establish commercial training/use rights, metered village accuracy, operator approval or production readiness. Existing evidence labels and notices remain in the app.

## Updates and common failures

- **Deployment fails running Python/pandas:** check that Root Directory is `aimenergy-app`, the pushed commit includes `vercel.json`, and the custom install command is in effect.
- **404 at `/`:** verify Output Directory is `dist` and `dist/index.html` is tracked in the deployed commit.
- **Landing works but planner fails:** verify `dist/planner.html` and its assets are tracked; preserve `.html` links and avoid a catch-all rewrite that replaces every file with the landing page.
- **Model/data loading error:** check the deployed `dist/data` files and browser network errors. No training is required on the host.
- **Old version after updating:** a prepared device intentionally uses a complete older snapshot; refresh the offline pack while connected and reload. Do not clear site storage casually, as that can also delete local assessments.
- **`/api/health` returns 404:** expected for this static demo; it is not evidence that browser inference is broken.
- **A judge cannot access the URL:** check the deployment's access/protection settings and intended sharing audience before submitting the link.

For future source changes, push the intended branch and inspect the corresponding Vercel deployment. Preserve actual commit history; publishing does not change when the project was developed.
