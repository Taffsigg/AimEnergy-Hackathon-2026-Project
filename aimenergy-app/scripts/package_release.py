"""Package the noncommercial hackathon exhibit; no uploads or publication.

Portable: app, models, scripts, docs, aggregate audits and blank templates.
Local: also private working data. Both exclude incomplete downloads and caches.
"""
import argparse
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def include(path: Path, local: bool) -> bool:
    rel = path.relative_to(ROOT)
    if any(p in {".git", "node_modules", "__pycache__", ".venv"} for p in rel.parts):
        return False
    lower = path.name.lower()
    if lower.startswith(".env") or lower.endswith((".part", ".pyc", ".log", ".bin", ".zip")) or "cookie" in lower or "headers" in lower:
        return False
    if rel.parts[0] != "Data":
        return True
    if len(rel.parts) == 2 and rel.name in {"README.md", ".gitignore"}:
        return True
    if rel.parts[1] == "templates":
        return True
    if not local:
        return rel.as_posix() in {
            "Data/metadata/tanzania-metered-audit.json", "Data/metadata/kit-metered-audit.json",
            "Data/metadata/metered-benchmark-protocol.json",
            "Data/metadata/satellite-evidence-audit.json", "Data/metadata/drone-illustration.json",
            "Data/metadata/drc-dataverse-source.json", "Data/metadata/drc-dataverse-audit.json",
            "Data/metadata/drc-benchmark-protocol.json",
            "Data/metadata/solar-resource-audit.json",
        }
    if rel.parts[:4] == ("Data", "raw", "metered", "kit"):
        # Keep source documentation, not repository session pages/handler scratch.
        return lower in {"readme.txt", "dataset.desc_md.xml", "dataset.tech_md.xml", "paper.pdf",
                         "radar_terms_for_data_users.pdf", "acquisition_notes.md", "landing-metadata.json"}
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true", help="include private working data; do not publish this ZIP")
    args = parser.parse_args()
    output = ROOT.parent / ("AimEnergy-ML-Local.zip" if args.local else "AimEnergy-Hackathon.zip")
    temporary = output.with_suffix(".zip.tmp")
    count = 0
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in sorted(ROOT.rglob("*")):
            if path.is_file() and include(path, args.local):
                bundle.write(path, (Path(ROOT.name) / path.relative_to(ROOT)).as_posix())
                count += 1
    temporary.replace(output)
    print(f"{output}: {count} files, {output.stat().st_size:,} bytes; {'PRIVATE local' if args.local else 'noncommercial hackathon'}")


if __name__ == "__main__":
    main()
