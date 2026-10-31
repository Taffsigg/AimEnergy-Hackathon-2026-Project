"""Acquire one real PVGIS pilot resource; never substitutes it for other villages."""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = "https://re.jrc.ec.europa.eu/api/v5_3/seriescalc?lat=3.487226&lon=32.969193&startyear=2023&endyear=2023&pvcalculation=1&peakpower=1&loss=14&angle=10&aspect=0&outputformat=json"


def main():
    path = ROOT / "Data/raw/solar/pvgis-orii-2023.json"
    if path.exists():
        raw = path.read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=45) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Unexpected PVGIS response size")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    source = json.loads(raw)
    rows = source["outputs"]["hourly"]
    if len(rows) != 8760:
        raise ValueError("Expected complete non-leap year")
    values = [None] * 8760
    start = datetime(2023, 1, 1)
    for i, row in enumerate(rows):
        date = datetime.strptime(row["time"], "%Y%m%d:%H%M")
        if date.replace(minute=0) != start + timedelta(hours=i):
            raise ValueError("Missing or duplicate source hour")
        watts = row["P"]
        if not isinstance(watts, (int, float)) or not 0 <= watts <= 2000:
            raise ValueError("Invalid per-kWp PV sample")
        values[(i + 3) % 8760] = watts / 1000
    resource = {"siteId": "5502954", "siteName": "Orii Gangodye", "latitude": 3.487226,
                "longitude": 32.969193, "year": 2023, "hourlyKWhPerKWp": values,
                "source": "European Commission JRC PVGIS 5.3 / SARAH3",
                "timezone": "UTC+3, cyclic year-wrap approximation; source minute samples assigned to hour slots",
                "meta": source["inputs"], "source_url": URL,
                "source_sha256": hashlib.sha256(raw).hexdigest(),
                "annual_kwh_per_kwp": sum(values),
                "interpretation": "Modeled AC PV power samples integrated as representative one-hour values, not measured generation. 14% system losses are already included; fixed 10-degree south-facing free-standing c-Si reference."}
    result = {"schema": 1, "acquired_at_utc": datetime.now(timezone.utc).isoformat(),
              "attribution": "European Commission, Joint Research Centre, PVGIS; SARAH3 solar resource and ERA5 meteorology",
              "terms_url": "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en",
              "coverage": "One acquired pilot example; no imagery, no automatic per-village live fetching",
              "resources": [resource]}
    output = ROOT / "dist/data/solar-resource.json"
    output.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    audit = {**result, "resources": [{k: v for k, v in resource.items() if k != "hourlyKWhPerKWp"}],
             "source_bytes": len(raw), "source_rows": len(rows), "local_source": "Data/raw/solar/pvgis-orii-2023.json"}
    (ROOT / "Data/metadata/solar-resource-audit.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(f"Acquired {len(rows)} hourly PV samples; {sum(values):.2f} modeled kWh/kWp/year. {output}")


if __name__ == "__main__":
    main()
