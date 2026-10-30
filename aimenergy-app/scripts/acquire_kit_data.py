"""Acquire the public KIT archive with verified TLS, no automatic quota retries.
Run only after reviewing/accepting RADAR's public download terms.
Uses Windows curl and supports a previously accepted session cookie file.
Never executes downloaded code or loads pickle data.
"""
import argparse
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path

URL = "https://radar.kit.edu/radar-backend/archives/PxzzPHZdpMnlkMDH/versions/1/content"
EXPECTED_BYTES = 988638720
EXPECTED_MD5 = "2e9a2a7579a1e36a005753290cfd6c17"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Data/raw/metered/kit"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--terms-reviewed-and-accepted", action="store_true", required=True)
    parser.add_argument("--cookie-file", type=Path)
    parser.add_argument("--max-time-seconds", type=int, default=14400, help="Bound download to four hours by default")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    archive = OUT / "10.35097-1305.tar"
    partial = OUT / "10.35097-1305.tar.part"
    if not archive.exists():
        cmd = ["curl.exe", "--fail", "--location", "--show-error", "--max-time", str(args.max_time_seconds), "--continue-at", "-", "--max-filesize", str(EXPECTED_BYTES), "--dump-header", str(OUT / "full-download-headers.txt"), "--output", str(partial)]
        if args.cookie_file:
            cmd += ["--cookie", str(args.cookie_file)]
        cmd.append(URL)
        result = subprocess.run(cmd, check=False)
        if result.returncode:
            raise SystemExit("Download failed (curl exit %d). Inspect headers; if HTTP 429, wait before manually rerunning. No automatic retry." % result.returncode)
        if partial.stat().st_size != EXPECTED_BYTES:
            raise SystemExit("Unexpected archive size; retained .part for inspection.")
        partial.replace(archive)
    md5, sha256 = hashlib.md5(), hashlib.sha256()
    with archive.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            md5.update(chunk)
            sha256.update(chunk)
    if archive.stat().st_size != EXPECTED_BYTES or md5.hexdigest() != EXPECTED_MD5:
        raise SystemExit("Archive integrity mismatch; do not use data.")
    inventory = []
    extracted = []
    with tarfile.open(archive, "r:") as bundle:
        for member in bundle:
            inventory.append({"name": member.name, "size": member.size})
            name = Path(member.name).name
            useful = "haiti" in name.lower() or "symbol" in name.lower() or name.lower().endswith(("readme.txt", ".xml"))
            if not (member.isfile() and useful and member.size < 100_000_000):
                continue
            target = OUT / "extracted" / name
            target.parent.mkdir(exist_ok=True)
            source = bundle.extractfile(member)
            if source is None:
                continue
            with source, target.open("wb") as dest:
                while chunk := source.read(1024 * 1024):
                    dest.write(chunk)
            extracted.append(str(target.relative_to(ROOT)))
    (OUT / "acquisition-result.json").write_text(json.dumps({"url": URL, "bytes": archive.stat().st_size, "md5": md5.hexdigest(), "sha256": sha256.hexdigest(), "inventory": inventory, "extracted": extracted}, indent=2), encoding="utf-8")
    print("Verified archive and extracted", len(extracted), "documentation/Haiti files.", flush=True)

if __name__ == "__main__":
    main()
