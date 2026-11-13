"""A read-only mock data source with a disk cache. It has the shape of a real provider:
a list of allowed actions, one call function, and an answer cache keyed by the call.
Replace this file with a client of your real source and keep the same three rules."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import random
from pathlib import Path

READ_ACTIONS = frozenset({"list-records"})

# (title, product, severity weights for Sev1..Sev4, daily rate, [(cause field, weight)], [resolution text])
ISSUES = [
    ("Checkout latency is high", "Checkout", (0.02, 0.08, 0.6, 0.3), 0.55,
     [("Dependency - payments scaling", 5), ("Our issue - capacity", 3), ("Transient infrastructure issue", 2)],
     ["Payments provider recovered by itself.", "Scaled the checkout fleet.", "Retries absorbed the spike."]),
    ("Search error rate is high", "Search", (0.0, 0.1, 0.55, 0.35), 0.45,
     [("Dependency - index rebuild", 6), ("Our issue - code bug", 3), ("Other", 1)],
     ["Index rebuild finished.", "Rolled back the last release.", "Fixed the query parser."]),
    ("Login failures are rising", "Accounts", (0.03, 0.12, 0.55, 0.3), 0.3,
     [("Our issue - code bug", 5), ("Dependency - identity provider", 4), ("Other", 1)],
     ["Fixed the token refresh bug.", "Identity provider restored service.", "Cache was stale. Flushed it."]),
    ("Notification queue is backing up", "Notifications", (0.0, 0.05, 0.5, 0.45), 0.5,
     [("Transient infrastructure issue", 5), ("Our issue - capacity", 3), ("Alarm - overly sensitive", 2)],
     ["Queue drained by itself.", "Added consumers.", "Raised the alarm threshold."]),
    ("Catalog import job failed", "Catalog", (0.0, 0.04, 0.46, 0.5), 0.35,
     [("Dependency - supplier feed", 6), ("Our issue - data quality", 3), ("Other", 1)],
     ["Supplier sent a corrected feed.", "Re-ran the import.", "Fixed the schema mapping."]),
    ("Payment webhook is failing", "Checkout", (0.02, 0.1, 0.6, 0.28), 0.2,
     [("Dependency - payments scaling", 6), ("Our issue - code bug", 3), ("Other", 1)],
     ["Payments provider replayed the events.", "Fixed the signature check."]),
    ("Image resize jobs are slow", "Catalog", (0.0, 0.0, 0.4, 0.6), 0.25,
     [("Alarm - overly sensitive", 5), ("Our issue - capacity", 3), ("Transient infrastructure issue", 2)],
     ["Metric was stable. Closed.", "Added workers.", "Raised the alarm threshold."]),
    ("Search results are stale", "Search", (0.0, 0.08, 0.5, 0.42), 0.18,
     [("Our issue - data quality", 5), ("Dependency - index rebuild", 3), ("Other", 2)],
     ["Re-indexed the affected shards.", "Index rebuild finished."]),
    ("Session store memory is high", "Accounts", (0.0, 0.05, 0.45, 0.5), 0.22,
     [("Our issue - capacity", 6), ("Transient infrastructure issue", 3), ("Alarm - out of date", 1)],
     ["Resized the session store.", "Alarm removed.", "Memory dropped after a restart."]),
    ("Email provider rejects messages", "Notifications", (0.01, 0.07, 0.52, 0.4), 0.15,
     [("Dependency - email provider", 8), ("Our issue - code bug", 1), ("Other", 1)],
     ["Provider lifted the rate limit.", "Switched to the backup route."]),
]
SOURCE_PERSON_SHARE = 0.15


class MockSource:
    """list-records(since, until) returns the mock tickets of the period, the same way for the same seed."""

    def __init__(self, cache_dir: Path, seed: int = 42, use_cache: bool = True):
        self.cache_dir = Path(cache_dir)
        self.seed = seed
        self.use_cache = use_cache
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def call(self, action: str, params: dict) -> list[dict]:
        if action not in READ_ACTIONS:
            raise PermissionError(f"refusing action {action}")
        key = hashlib.sha256(json.dumps([action, params, self.seed], sort_keys=True).encode()).hexdigest()[:16]
        path = self.cache_dir / f"{key}.json"
        if self.use_cache and path.exists():
            return json.loads(path.read_text())
        rows = self._list_records(**params)
        path.write_text(json.dumps(rows))
        return rows

    def _list_records(self, since: str, until: str) -> list[dict]:
        rng = random.Random(self.seed)
        start = dt.datetime.fromisoformat(since).replace(tzinfo=dt.timezone.utc)
        days = (dt.datetime.fromisoformat(until).replace(tzinfo=dt.timezone.utc) - start).days + 1
        rows = []
        for title, product, sev_w, rate, causes, resolutions in ISSUES:
            spikes = {rng.randrange(days) for _ in range(5)}
            for d in range(days):
                day = start + dt.timedelta(days=d)
                season = 1 + 0.35 * ((d % 7) in (1, 2)) + 0.25 * (d / days)
                expected = rate * season * (5 if d in spikes else 1)
                for _ in range(int(expected + rng.random())):
                    created = day + dt.timedelta(seconds=rng.randrange(86400))
                    sev = rng.choices([1, 2, 3, 4], weights=sev_w)[0]
                    cause = rng.choices([c for c, _ in causes], weights=[w for _, w in causes])[0]
                    minutes = rng.lognormvariate(3.2, 1.1) * (1.8 if sev <= 2 else 1.0)
                    resolved = created + dt.timedelta(minutes=minutes) if rng.random() < 0.94 else None
                    rows.append({
                        "title": title, "product": product, "region": rng.choice(["East", "West", "Europe"]), "severity": sev,
                        "created": created.isoformat(timespec="seconds"), "resolved": resolved.isoformat(timespec="seconds") if resolved else None,
                        "source": "person" if rng.random() < SOURCE_PERSON_SHARE else "alarm", "cause_field": cause,
                        "resolution": rng.choice(resolutions) if resolved and rng.random() < 0.8 else "",
                    })
        rows.sort(key=lambda r: r["created"])
        for i, r in enumerate(rows, 1):
            r["id"] = f"T-{i:05d}"
        return rows
