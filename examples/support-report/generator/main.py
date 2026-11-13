#!/usr/bin/env python3
"""Support queue report generator (mock data). Commands:

    python3 main.py fetch   # records from the source to .cache/records.json
    python3 main.py build   # records to ../output/public/report-data.json and the CSV downloads
    python3 main.py all     # both
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import sys
from pathlib import Path

from providers.mock import MockSource
from report.build import build

HERE = Path(__file__).parent
CACHE = HERE / ".cache"
OUT = HERE.parent / "output" / "public"
TODAY = "2026-06-30"  # fixed so the mock report is the same on every run


def fetch(args) -> None:
    since = (dt.date.fromisoformat(TODAY) - dt.timedelta(days=364)).isoformat()
    rows = MockSource(CACHE, use_cache=not args.refresh).call("list-records", {"since": since, "until": TODAY})
    (CACHE / "records.json").write_text(json.dumps(rows))
    print(f"Wrote {CACHE / 'records.json'} ({len(rows)} records, {since} to {TODAY}).")


def build_cmd(_args) -> None:
    config = json.loads((HERE / "config" / "causes.json").read_text())
    reviewed = json.loads((HERE / "data" / "reviewed.json").read_text())
    data = build(json.loads((CACHE / "records.json").read_text()), TODAY, config, reviewed)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report-data.json").write_text(json.dumps(data, separators=(",", ":")))
    with open(OUT / "tickets.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        cols = ["id", "title", "item", "region", "sev", "c", "r", "src", "cf", "res", "cause", "by", "wk"]
        w.writerow(["id", "title", "product", "region", "severity", "created_utc", "resolved_utc", "source", "cause_field", "resolution",
                    "cause", "cause_by", "week_start_utc"])
        for t in data["tickets"]:
            w.writerow([dt.datetime.fromtimestamp(t[k], dt.timezone.utc).isoformat(timespec="seconds") if k in ("c", "r", "wk") and t[k] else t[k] if t[k] is not None else "" for k in cols])
    with open(OUT / "weeks.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["week_start_utc", "week_end_utc"])
        for wk in data["weeks"]:
            w.writerow([dt.datetime.fromtimestamp(wk["s"], dt.timezone.utc).isoformat(timespec="minutes"), dt.datetime.fromtimestamp(wk["e"], dt.timezone.utc).isoformat(timespec="minutes")])
    print(f"Wrote report-data.json, tickets.csv and weeks.csv to {OUT} ({len(data['tickets'])} tickets).")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch")
    f.add_argument("--refresh", action="store_true", help="ignore the cache")
    sub.add_parser("build")
    a = sub.add_parser("all")
    a.add_argument("--refresh", action="store_true")
    args = p.parse_args()
    if args.cmd in ("fetch", "all"):
        fetch(args)
    if args.cmd in ("build", "all"):
        build_cmd(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
