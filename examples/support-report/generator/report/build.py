"""Turn raw records into the data file of the report: compact records, weeks, and causes."""

from __future__ import annotations

import datetime as dt
import re

UTC = dt.timezone.utc


def epoch(iso: str | None) -> int | None:
    return int(dt.datetime.fromisoformat(iso).replace(tzinfo=UTC).timestamp()) if iso else None


def week_start(ts: int, weekday: int = 2, hour: int = 12) -> int:
    """Epoch of the start of the week that holds ts. A week starts on `weekday` (Monday = 0) at `hour`, UTC."""
    d = dt.datetime.fromtimestamp(ts, UTC)
    start = (d - dt.timedelta(days=(d.weekday() - weekday) % 7)).replace(hour=hour, minute=0, second=0, microsecond=0)
    if start > d:
        start -= dt.timedelta(days=7)
    return int(start.timestamp())


def weeks_between(first_ts: int, last_ts: int, weekday: int = 2, hour: int = 12) -> list[dict]:
    weeks, start = [], week_start(first_ts, weekday, hour)
    while start <= last_ts:
        weeks.append({"s": start, "e": start + 7 * 86400})
        start += 7 * 86400
    return weeks


def cause_class(field: str, rules: list[list[str]]) -> str:
    for pattern, name in rules:
        if re.search(pattern, field):
            return name
    return "unclear"


def build(records: list[dict], today: str, config: dict, reviewed: dict) -> dict:
    """reviewed maps a ticket id to a corrected cause class. A corrected cause is marked as reviewed."""
    wk = config["week"]
    out = []
    for r in records:
        created = epoch(r["created"])
        cause, by = cause_class(r["cause_field"], config["rules"]), "field"
        if r["id"] in reviewed:
            cause, by = reviewed[r["id"]]["cause"], "review"
        out.append({"id": r["id"], "title": r["title"], "item": r["product"], "region": r["region"], "sev": r["severity"],
                    "c": created, "r": epoch(r["resolved"]), "src": r["source"], "cf": r["cause_field"], "res": r["resolution"],
                    "cause": cause, "by": by, "wk": week_start(created, wk["weekday"], wk["hour"])})
    now = epoch(today + "T23:59:59")
    return {"generatedAt": today, "today": today, "source": "mock data (seed 42)", "weekRule": wk["note"],
            "weeks": weeks_between(min(t["c"] for t in out), now, wk["weekday"], wk["hour"]), "tickets": out}
