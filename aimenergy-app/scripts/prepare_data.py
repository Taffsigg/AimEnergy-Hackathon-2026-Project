"""Prepare compact public site features and aggregate-only survey priors.

Run with Python 3.12 and pandas. No notebook execution, unpickling, network,
or household-level export. Inputs remain unchanged.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]
REPO = ROOT / "lamwo-electrification-project-main/lamwo-electrification-project-main"
SURVEY = ROOT / "Household electricity demand in Uganda/analysis_clean_noMI.dta"


def clean(value):
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [clean(v) for v in value]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def write_json(path, value):
    path.write_text(json.dumps(clean(value), ensure_ascii=False, allow_nan=False,
                               separators=(",", ":")), encoding="utf-8")


def rdp(points, tolerance):
    """Iterative Douglas-Peucker, measured in source WGS84 degrees."""
    if len(points) <= 2:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        a, b = points[first], points[last]
        dx, dy = b[0] - a[0], b[1] - a[1]
        norm = dx * dx + dy * dy
        far, index = -1.0, None
        for i in range(first + 1, last):
            p = points[i]
            t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/norm)) if norm else 0
            dist = (p[0]-a[0]-t*dx)**2 + (p[1]-a[1]-t*dy)**2
            if dist > far:
                far, index = dist, i
        if index is not None and far > tolerance * tolerance:
            keep.add(index)
            stack.extend([(first, index), (index, last)])
    return [points[i] for i in sorted(keep)]


def simplify_ring(ring, tolerance):
    # Split a closed ring at its farthest vertex, preserving a usable polygon.
    points = ring[:-1] if ring[0] == ring[-1] else ring[:]
    split = max(range(1, len(points)), key=lambda i: sum((points[i][k]-points[0][k])**2 for k in (0, 1)))
    result = rdp(points[:split+1], tolerance)[:-1] + rdp(points[split:]+[points[0]], tolerance)
    if len(result) < 4:
        result = points + [points[0]]
    return [[round(p[0], 6), round(p[1], 6)] for p in result]


def simplify_geometry(geometry, tolerance):
    polys = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    result = [[simplify_ring(ring, tolerance) for ring in poly] for poly in polys]
    return {"type": geometry["type"], "coordinates": result if geometry["type"] == "MultiPolygon" else result[0]}


def inside_ring(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside = not inside
    return inside


def contains(geometry, point):
    polys = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    return any(inside_ring(point, poly[0]) and not any(inside_ring(point, hole) for hole in poly[1:]) for poly in polys)


def summary(frame):
    valid = frame.loc[frame.kwh_m.notna() & np.isfinite(frame.kwh_m) & (frame.kwh_m >= 0)]
    x = valid.kwh_m.to_numpy(float)
    weighted = valid.loc[valid.wgt.notna() & np.isfinite(valid.wgt) & (valid.wgt > 0)]
    wx, w = weighted.kwh_m.to_numpy(float), weighted.wgt.to_numpy(float)
    order = np.argsort(wx, kind="stable")
    sx, sw = wx[order], w[order]
    cumulative = np.cumsum(sw)
    def wq(q):
        return float(sx[min(np.searchsorted(cumulative, q*cumulative[-1], side="left"), len(sx)-1)]) if len(sx) else None
    return {"households": len(frame), "valid_target_households": len(valid),
            "missing_target_households": int(frame.kwh_m.isna().sum()),
            "weighted_households": len(weighted), "weight_sum": float(w.sum()),
            "effective_weighted_sample_size": float(w.sum()**2/(w*w).sum()) if len(w) else None,
            "unweighted": {"mean": float(np.mean(x)), **{f"p{int(q*100)}": float(np.quantile(x, q)) for q in [.1, .5, .9]}},
            "weighted": {"mean": float(np.average(wx, weights=w)), **{f"p{int(q*100)}": wq(q) for q in [.1, .5, .9]}}}


def prepare(out):
    out.mkdir(parents=True, exist_ok=True)
    processed = REPO / "data/processed"
    village = pd.read_csv(processed / "village_data.csv")
    candidate = pd.read_csv(processed / "candidate_mg_testdata.csv")
    existing = pd.read_csv(processed / "existing_mg_trainingdata.csv")
    api = json.loads((REPO / "webapp/pages/api/villages.json").read_text(encoding="utf-8"))
    geo = json.loads((REPO / "webapp/public/geojson_maps/lamwo_villages.geojson").read_text(encoding="utf-8"))
    names = {int(r["ID"]): r for r in api}
    polygons = {int(f["properties"]["ID"]): f for f in geo["features"]}
    ids = set(village.village_id.astype(int))
    candidate_ids, existing_ids = set(candidate.village_id.astype(int)), set(existing.village_id.astype(int))
    assert len(ids) == len(village) == 411
    assert ids == set(names) == set(polygons), "Incomplete village/name/geometry joins"
    assert len(candidate_ids) == 39 and candidate_ids <= ids
    assert len(existing) == 25 and len(existing_ids) == 24 and existing_ids <= ids
    sites, features = [], []
    zero_sensitive = ["building_count", "total_population", "mean_ndvi", "mean_wind_speed", "mean_pvout_solar_radiation"]
    centers_inside = 0
    outside_ids = []
    for record in village.to_dict(orient="records"):
        vid = int(record["village_id"])
        loc = names[vid]
        point = [float(loc["longitude"]), float(loc["latitude"])]
        assert -180 <= point[0] <= 180 and -90 <= point[1] <= 90
        center_inside = contains(polygons[vid]["geometry"], point)
        centers_inside += center_inside
        if not center_inside:
            outside_ids.append(vid)
        flags = [f"observed_zero_{field}" for field in zero_sensitive if record[field] == 0]
        if not center_inside:
            flags.append("source_center_outside_polygon")
        flags += [f"missing_{key}" for key, value in record.items() if pd.isna(value) and key != "protected_area_name"]
        record.update({"id": vid, "name": loc["village"], "district": loc["district"], "subcounty": loc["subcounty"],
                       "parish": loc["parish"], "latitude": point[1], "longitude": point[0], "lat": point[1], "lon": point[0],
                       "population": record["total_population"], "buildings": record["building_count"],
                       "schools": record["educational_facilities"], "clinics": record["health_facilities"],
                       "candidate": vid in candidate_ids, "existing": vid in existing_ids, "data_flags": flags})
        sites.append(clean(record))
        features.append({"type": "Feature", "id": vid, "properties": {"id": vid, "village_id": vid, "name": loc["village"]},
                         "geometry": simplify_geometry(polygons[vid]["geometry"], .0002)})
    metadata = {"schema_version": 1, "site_count": len(sites), "candidate_count": len(candidate_ids), "existing_count": len(existing_ids), "existing_site_records": len(existing),
                "crs": "WGS84 longitude,latitude", "centers_source": "webapp/pages/api/villages.json",
                "features_source": "data/processed/village_data.csv", "joins": "Exact integer village_id = API ID = polygon ID",
                "geographic_join_coverage": "411/411", "centers_inside_source_polygon": centers_inside, "source_centers_outside_polygon_ids": outside_ids,
                "candidate_definition": "Member of 39-row candidate_mg_testdata.csv", "existing_definition": "Member of 25-row existing_mg_trainingdata.csv",
                "raw_flag_totals": {"candidate_minigrids": int(village.candidate_minigrids.sum()), "existing_minigrids": int(village.existing_minigrids.sum())},
                "warning": "Observed contextual features; no metered village demand labels. Population is a raster-derived fractional estimate, not a household count. Observed zeros are not automatically nodata."}
    write_json(out / "sites.json", {"metadata": metadata, "sites": sites})
    write_json(out / "boundaries.geojson", {"type": "FeatureCollection", "features": features})
    assert (out / "boundaries.geojson").stat().st_size < 1_000_000

    reader = pd.io.stata.StataReader(SURVEY)
    value_labels = reader.value_labels()
    variable_labels = reader.variable_labels()
    label_keys = dict(zip(reader._varlist, reader._lbllist))
    urban_labels = value_labels[label_keys["urban"]]
    assert urban_labels[0] == "Rural" and urban_labels[1] == "Urban"
    assert "weight" in variable_labels["wgt"].lower()
    data = reader.read(convert_categoricals=False)
    stable = ["kwh_m", "wgt", "urban", "district", "elec_cost_ugx", "elec_days", "elec_price"]
    variation = data.groupby("hhid")[stable].nunique(dropna=False).max()
    assert (variation == 1).all(), f"Unstable household fields: {variation.to_dict()}"
    hh = data[["hhid"]+stable].drop_duplicates("hhid").copy()
    repeats = data.groupby("hhid").size()
    formula = data.elec_cost_ugx*30/data.elec_days/250
    formula_valid = formula.notna() & data.kwh_m.notna() & np.isfinite(formula)
    assert np.allclose(formula[formula_valid], data.loc[formula_valid, "kwh_m"])
    overall = summary(hh)
    groups = {urban_labels[int(code)].lower(): {"code": int(code), "label": urban_labels[int(code)], **summary(group)}
              for code, group in hh.groupby("urban")}
    survey_summary = {"schema_version": 1, "units": "kWh per household per 30-day month, survey expenditure proxy",
                      "target": {"field": "kwh_m", "kind": "survey_expenditure_proxy", "metered": False,
                                 "formula": "elec_cost_ugx * 30 / elec_days / 250", "assumed_tariff_ugx_per_kwh": 250,
                                 "formula_uncheckable_rows": int((~formula_valid).sum()), "formula_checked_rows": int(formula_valid.sum()), "formula_matched_rows": int(formula_valid.sum())},
                      "source": {"file": SURVEY.name, "original_survey": "Uganda National Household Survey 2019/2020",
                                 "weight_field": "wgt", "weight_label": variable_labels["wgt"], "urban_value_labels": urban_labels},
                      "quality": {"raw_rows": len(data), "unique_households": len(hh), "repeats_per_household": {"min": int(repeats.min()), "max": int(repeats.max())},
                                  "stable_fields_verified": stable, "hhsize_inconsistent_households": int((data.groupby("hhid").hhsize.nunique(dropna=False)>1).sum()),
                                  "excluded_fields": ["hhsize", "all individual/asset/consumption-item records"],
                                  "lamwo_households": int(hh.district.astype(str).str.upper().eq("LAMWO").sum()),
                                  "district_count": int(hh.district.nunique()), "no_geographic_join_to_lamwo": True},
                      "overall": overall, "groups": groups,
                      "methods": {"deduplication": "One row per hhid only after all included fields verified constant, including missingness",
                                  "unweighted_quantile": "NumPy linear interpolation", "weighted_quantile": "Inverse empirical weighted CDF: first cumulative weight >= q times total weight",
                                  "weighted_mean": "sum(kwh_m*wgt)/sum(wgt), one survey weight per household",
                                  "interpretation": "Quantiles describe surveyed households; they are scenario anchors, not confidence intervals or a metered validation result."},
                      "recommended_defaults": {"group": "rural", "statistic": "weighted.p50", "low": groups["rural"]["weighted"]["p10"],
                                               "base": groups["rural"]["weighted"]["p50"], "high": groups["rural"]["weighted"]["p90"],
                                               "note": "Exploratory transferable household-use anchors only; apply explicit connection and occupancy assumptions. Urban-heavy national sample does not measure Lamwo demand."}}
    write_json(out / "survey-summary.json", survey_summary)
    sources = [processed / n for n in ["village_data.csv", "candidate_mg_testdata.csv", "existing_mg_trainingdata.csv"]]
    sources += [REPO / "webapp/pages/api/villages.json", REPO / "webapp/public/geojson_maps/lamwo_villages.geojson", SURVEY]
    catalog = {"schema_version": 1, "purpose": "AimEnergy reproducible public demo inputs and aggregate-only survey priors",
               "sources": [{"path": str(p.relative_to(ROOT)).replace("\\", "/"), "bytes": p.stat().st_size,
                            "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources],
               "field_provenance": {"id,village_id": "village_data.csv village_id; exact joins verified",
                                    "name,district,subcounty,parish,latitude,longitude,lat,lon": "API villages.json; original centers retained",
                                    "population": "Alias of village_data.csv total_population; fractional raster population estimate",
                                    "buildings": "Alias of village_data.csv building_count; not occupied households",
                                    "schools,clinics": "Aliases of educational_facilities,health_facilities",
                                    "all_original_village_fields": "Unmodified village_data.csv values; NaN serialized null",
                                    "candidate,existing": "Curated table membership; independent from original raw village flags",
                                    "data_flags": "Derived observed-zero/missingness flags; zero is not asserted to mean nodata",
                                    "boundary": "lamwo_villages.geojson WGS84 rings; display-only Douglas-Peucker 0.0002-degree tolerance, 6 decimals"},
               "quality": {"village_rows": 411, "name_center_joined": 411, "boundary_joined": 411, "candidate_joined": 39, "existing_site_rows_joined": 25, "existing_unique_villages": 24,
                           "existing_duplicate_village_ids": {"5502887": ["Muddu Central", "Otaa"]},
                           "centers_inside_original_boundary": centers_inside, "source_centers_outside_polygon_ids": outside_ids,
                           "zero_counts": {k: int((village[k] == 0).sum()) for k in zero_sensitive},
                           "missing_counts": {k: int(village[k].isna().sum()) for k in village},
                           "nodata_status": "Source has no verified per-feature nodata mask; zero counts retained and flagged, not converted to missing",
                           "api_building_count_disagreements": sum(int(names[int(r.village_id)].get("num_buildings", -1)) != int(r.building_count) for r in village.itertuples()),
                           "boundary_bytes": (out / "boundaries.geojson").stat().st_size},
               "limitations": ["No supplied metered village or mini-grid kWh outcome; existing capacity and scores are not consumption.",
                               "No exact source dates or verified licenses inferred for geospatial inputs; review upstream before public redistribution.",
                               "Simplified boundaries are for visualization, not legal, engineering, or area calculations; simplification is not topology-preserving.",
                               "Raw candidate/existing flags cover 51/28 villages; curated tables cover39/24 unique villages (25 existing records, two sharing ID5502887); original raw flags preserved.",
                               "API building observations differ from processed CSV; processed feature table consistently used.",
                               "Survey observations derive kWh from expenditure using assumed tariff250UGX/kWh; survey dates2019/2020.",
                               "445 unique households and repeated records; hhsize is inconsistent and excluded. No survey microdata or household IDs exported.",
                               "No Lamwo household observations or verified join to village table; transferred priors require field calibration."],
               "outputs": {"sites.json": "{metadata,sites:[{id,name,latitude,longitude,population,buildings,schools,clinics,candidate,existing,data_flags,...original fields}]}",
                           "boundaries.geojson": "WGS84 FeatureCollection; Feature.id and properties.id/village_id match site IDs",
                           "survey-summary.json": "Aggregate counts, weighted/unweighted means and p10/p50/p90; overall and rural/urban",
                           "catalog.json": "Input hashes, field provenance, join coverage, zero/missing counts, limitations"}}
    write_json(out / "catalog.json", catalog)
    print(json.dumps({"sites": len(sites), "candidate": 39, "existing": len(existing_ids), "existing_site_records": len(existing), "boundary_bytes": catalog["quality"]["boundary_bytes"],
                      "centers_inside": centers_inside, "survey": overall, "rural": groups["rural"], "defaults": survey_summary["recommended_defaults"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=APP / "dist/data")
    prepare(parser.parse_args().out)
