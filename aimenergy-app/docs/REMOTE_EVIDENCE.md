# Satellite and drone evidence

Open **Satellite & drone** in the planner, or follow `/planner.html#remote` from the landing page. The workspace separates real imagery, imported observations and AI concept artwork. It provides field context without modifying household ML, source geographic records, demand assumptions or model evaluation.

## Acquired satellite example

The actual Orii Gangodye pilot crop is `dist/images/satellite-orii-gangodye-2024.jpg`: 1115×783 pixels, 148,132 bytes, EPSG:4326, bounds `[32.913643, 3.453727, 33.013983, 3.524065]` in west/south/east/north order. It covers the village polygon plus a small margin. The source is the **2024 annual Sentinel-2 cloudless mosaic**, nominal 10 m resolution. It is not a single acquisition, current flight or roof-counting survey.

Required attribution is displayed with clickable links: [EOxCloudless](https://cloudless.eox.at) by [EOX IT Services GmbH](https://eox.at), **Contains modified Copernicus Sentinel data 2024**. The crop is included under **CC BY-NC-SA 4.0** for a noncommercial demonstration. Commercial deployment needs an appropriate license or replacement imagery. [Source announcement](https://www.eox.at/2025/03/sentinel-2-cloudless-2024/), [license](https://creativecommons.org/licenses/by-nc-sa/4.0/).

`dist/data/satellite-evidence.json` contains extent, source, year/date kind, nominal resolution, license, attribution and SHA-256. `Data/metadata/satellite-evidence-audit.json` retains detailed acquisition evidence. `scripts/acquire_satellite_evidence.py` performs bounded verified-HTTPS acquisition and hash checks. Source copies are local under `Data/raw/satellite/`.

The selected village boundary is rendered over the acquired image. Automatic imagery coverage is currently **one village**. Other locations show the acquisition gap and an explicit button to open the pilot; they are not assigned an unrelated image. Imported imagery/features use their supplied extents, and the map is descriptive rather than a positional-accuracy certification.

## Building-change view

[Google Open Buildings Temporal](https://sites.research.google/gr/open-buildings/temporal) supplies annual 2016–2023 building estimates. Public anonymous storage access was verified, but this project has **not aggregated village-level annual counts**. A temporary raster-processing dependency installation failed because the local drive had insufficient free space. The public manifest records `not_acquired` and an empty record array. This is not a zero-growth finding.

The workspace therefore shows a clear empty state, source link and local CSV importer. The year selector/chart appears only after actual observations are supplied. Its year selection changes the displayed count estimate, not the 2024 satellite image. A CSV needs:

```csv
year,building_count
```

Supply 2–100 rows with unique years from 1900 through the current UTC year and nonnegative numeric counts. Fractional estimates and declines are supported; a zero starting count has no defined percentage-growth value. Source/method is required. Inputs are labelled user-imported and not independently verified; there are no fabricated default counts.

Before publishing a Google-derived history, document the source rasters, annual inference dates, village polygon, CRS transformations, nodata treatment, fractional-count summation and overlap handling. Building-count growth is not occupied-household growth, customer growth or electricity-demand growth.

## Completed drone-survey imports

These are **browser-local imports**, not uploads to Vercel or an operator API. Select the correct village first. Enter a source/method and a valid observation date that is not in the future.

### GeoJSON

Use a standard WGS84 longitude/latitude `FeatureCollection`, with 1–2,000 features, at most 50,000 vertices and at most 1 MB. Supported geometries are Point, Polygon and MultiPolygon; rings must be closed. Reproject custom/projected CRS exports beforehand. Optional `properties.category` can be `building`, `school`, `clinic`, `mill` or `other`; the app preserves only this controlled annotation and strips arbitrary properties. Altitude is omitted.

The app counts imported features and polygon features. It does not independently classify them, count occupied homes or infer businesses from imagery. Raw flight photos, 3D meshes, point clouds, line networks and automatic computer-vision detection are not implemented.

### Georeferenced image

Export a processed orthomosaic to **PNG or JPEG**, at most 2 MB, 20 million pixels and 12,000 pixels per side. Enter its exact WGS84 west/south/east/north extent. GeoTIFF decoding and raw-photo photogrammetry are outside this browser workflow; tools such as [OpenDroneMap](https://docs.opendronemap.org/outputs/) can produce processed survey outputs beforehand.

Headers and limits are checked before image decoding, followed by actual decoder/dimension validation. The same checks run when restoring saved images. Extents are user declarations, not an independent georeferencing check; an incorrectly supplied extent will misplace the image. The display does not establish ground resolution, flight authorization, survey accuracy or engineering suitability.

### Storage and export

Valid imports retain their source, observation date and file fingerprint. They are stored under `aimenergy.remote.v1` in browser local storage, independently of field assessments. If persistence fails, the UI says imports are memory-only and recommends export. Site identity is captured before asynchronous reads to keep an import attached to its intended village.

**Export evidence** downloads the selected site, applicable public source manifest and local imports, including image data when supplied. This can contain precise survey geometry; keep private records within their approved sharing scope. An export is a backup/report, not an automatically synchronized or automatically re-imported record. **Remove local imports** has an Undo action during the current session. Browser site-data removal can delete saved imports.

**Open field assessment** continues into the existing workflow for the selected village. It does not automatically copy feature counts into responses or treat annotations as verified field evidence. Relevant answers must be recorded deliberately with their method and date.

## AI-generated drone artwork

`dist/images/drone-survey-concept.png` was generated with the **built-in image_gen tool** as conceptual editorial artwork. It is not a real drone flight, surveyed village or satellite image. That distinction is labelled in both the workspace and landing page. The real satellite crop remains a separate asset and data source.

The exact prompt, intended use, tool identity and image SHA-256 are recorded in `Data/metadata/drone-illustration.json`. The original generated file was copied into the project; its pixels were not used to create survey measurements, counts, training labels or demand estimates.

## Offline and Vercel

Offline contract **field-v5** has **33 required assets**, including the real satellite crop, concept artwork, source manifest and new modules. Refresh the field pack while connected, wait for Ready, then reload. The optional user imports are stored separately from the application snapshot. The image increases pack size by approximately 2.7 MB; slow connections or storage limits can prevent preparation, leaving the previous complete pack intact.

All new inference/display code runs client-side and uses ordinary static assets. The existing Vercel `dist` deployment configuration requires no satellite account, model key, Python runtime or drone-processing server for this acquired example. It does not provide live imagery acquisition, Google raster aggregation, flight control or cloud record storage.

## Verification scope

Unit checks cover bounded geometry, malformed/projected coordinates, ring closure, dates, source retention, fractional/declining histories, zero-base handling and raster header/type/pixel limits. Browser QA uses explicitly labelled synthetic survey/count fixtures and an existing satellite crop as a clearly labelled test overlay, never real drone evidence. Remove those QA imports after testing so the delivered default does not contain synthetic survey claims.
