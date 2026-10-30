# AimEnergy landing page

The local server root `/` now introduces the prototype. `/planner.html` opens the complete existing application. Links such as `/planner.html#ai`, `#villages`, `#field`, `#metered` and `#evidence` open their corresponding initial workspace. The planner's Home link returns to the landing page. Installed field-kit launches open the planner directly.

The landing page uses the existing forest-green/lime branding, real Lamwo boundaries, an actual field-workspace screenshot and an interactive Orii Gangodye scenario. Its grain-mill switch uses the same scenario engine, default inputs and cached RAMP shapes as the planner. It changes only the landing preview, not saved planner inputs or field records. The preview is illustrative scenario arithmetic, not measured consumption. UI values are rounded for display.

Files: `dist/index.html`, `dist/landing.css`, `dist/landing.js`, `dist/images/field-assessment.jpg`. The former application HTML is preserved as `dist/planner.html`. No API endpoints, training pipeline or model artifacts were replaced. Content separates household survey evaluation, single-site current diagnostics and unvalidated village scenarios; no customer/testimonial or operator-partnership claims were added.

The offline contract is `field-v4` with 27 assets, covering both entry pages. A returning prepared device may initially show the older root app while its previous worker updates; reload after the controller update, then explicitly prepare/refresh the field pack and reload to store the new complete snapshot. Snapshots and field records remain distinct; field records were not cleared or migrated. Optional web fonts fall back to system fonts offline. JavaScript is required for the live preview and mobile menu; navigation and prototype links remain ordinary HTML anchors.

Run `npm start`; open the printed root address. Use `npm test` for route/static serving and offline cache-policy regressions. Browser verification should cover the +495 kWh/month toggle, deep links, Home navigation, mobile menu, narrow layout and fresh offline preparation. This is an integrated local prototype page; no hosting deployment is established by these source changes.

Browser verification passed at desktop1366×900 and mobile390×844. The +495kWh/month preview, mobile navigation, AI/field deep links and Home navigation were exercised. Final server-unavailability testing passed field→landing→field navigation after normalizing URL fragments in the worker. The owned server was restored.
