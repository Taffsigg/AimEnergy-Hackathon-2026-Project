# Offline field kit

Serve this app on HTTPS or localhost. Open the field workspace while connected and choose **Prepare offline kit**. Read the status: ready is reported only after the service worker controls the page and every required static asset has been saved successfully. Merely opening the app does not prepare it. Browser private modes, storage policies or insufficient space may prevent preparation.

The kit contains the app, field workspace, JavaScript inference model, evaluation ledger, site/map geometry and summary datasets. Raw survey microdata, external fonts, remote services and API routes are excluded. API calls remain network-only; the worker never creates substitute predictions or fake API responses. Field observations are local browser records; export them manually. There is no background upload or server synchronization.

Preparation builds an isolated cache and commits its pointer only after all required files and a completion marker are saved. Failed preparation deletes its partial cache and preserves the previous complete kit. Once prepared, allowlisted app requests use the complete snapshot so a loss of connection cannot combine freshly downloaded model files with older cached files. Refresh the kit explicitly while connected, then reload to receive new app/model data. The current release is `field-v6`. Maintainers must bump this version in both `offline.js` and `sw.js` when changing the required asset contract. The last two successful snapshots are retained; older ones are pruned only after a successful refresh. Browser site-data controls can clear retained snapshots; this may also delete local field records, so export those first.

Only exact same-origin GET paths in the worker's `CORE` list are intercepted (plus the app root alias for `index.html`). Query-string URLs and unknown navigations are excluded. Before preparation, these static requests use the network with a 3-second timeout. Each preparation download gets 15 seconds. Cache eviction is checked on startup: missing files remove the ready indication and require preparation again.

Verify in a real browser: prepare successfully, save a field observation, stop the server or disconnect the network, reload the same URL and confirm that the model, map and saved observation still work. Reload a new tab on the same origin to check persistence. Restore connectivity before refreshing the kit. A web manifest supports standalone display on compatible browsers; installation prompts and SVG icon support depend on the browser/platform.

Implementation references: [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and [MDN CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage).

The v4 snapshot includes both the root landing page and planner.html, landing CSS/JS and the field-workspace image (27 assets total). Installed field-kit start_url points directly to planner.html. Returning v3 clients may need a reload after their controller updates; then explicitly prepare the new pack while online. Existing field records are not cleared.

Remote-evidence release v5 expands the contract to33 assets, adding the pilot satellite image, AI concept illustration, manifest and client-side evidence modules. Local survey/image imports remain in browser storage rather than the static snapshot. Refresh explicitly after updating.

DRC benchmark release v6 expands the contract to 35 assets, adding `drc-lab.js` and aggregate `data/drc-benchmark.json`. No DRC respondent rows or source files enter the offline pack.
