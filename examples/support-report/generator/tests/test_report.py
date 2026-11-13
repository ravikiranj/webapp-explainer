import datetime as dt
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from providers.mock import MockSource  # noqa: E402
from report.build import build, cause_class, week_start, weeks_between  # noqa: E402

UTC = dt.timezone.utc


def ts(y, m, d, h=0):
    return int(dt.datetime(y, m, d, h, tzinfo=UTC).timestamp())


class WeekTest(unittest.TestCase):
    def test_week_starts_wednesday_noon(self):
        # 2026-06-24 is a Wednesday. A time before noon belongs to the week before.
        self.assertEqual(week_start(ts(2026, 6, 24, 11)), ts(2026, 6, 17, 12))
        self.assertEqual(week_start(ts(2026, 6, 24, 12)), ts(2026, 6, 24, 12))
        self.assertEqual(week_start(ts(2026, 6, 30, 5)), ts(2026, 6, 24, 12))

    def test_weeks_are_contiguous(self):
        weeks = weeks_between(ts(2026, 6, 1), ts(2026, 6, 30))
        self.assertTrue(all(a["e"] == b["s"] for a, b in zip(weeks, weeks[1:])))
        self.assertLessEqual(weeks[0]["s"], ts(2026, 6, 1))
        self.assertGreater(weeks[-1]["e"], ts(2026, 6, 30))


class CauseTest(unittest.TestCase):
    rules = [["^Dependency", "dependency"], ["^Our issue", "ours"], [".*", "unclear"]]

    def test_rules(self):
        self.assertEqual(cause_class("Dependency - x", self.rules), "dependency")
        self.assertEqual(cause_class("Other", self.rules), "unclear")

    def test_reviewed_cause_wins_and_is_marked(self):
        rec = {"id": "T-1", "title": "t", "product": "p", "region": "r", "severity": 3, "created": "2026-06-01T00:00:00", "resolved": None,
               "source": "alarm", "cause_field": "Other", "resolution": ""}
        cfg = {"rules": self.rules, "week": {"weekday": 2, "hour": 12, "note": "x"}}
        out = build([rec], "2026-06-30", cfg, {"T-1": {"cause": "ours"}})["tickets"][0]
        self.assertEqual((out["cause"], out["by"]), ("ours", "review"))
        out = build([rec], "2026-06-30", cfg, {})["tickets"][0]
        self.assertEqual((out["cause"], out["by"]), ("unclear", "field"))


class ProviderTest(unittest.TestCase):
    def test_refuses_write_actions(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(PermissionError):
                MockSource(Path(d)).call("delete-record", {})

    def test_same_seed_gives_same_records(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            p = {"since": "2026-06-01", "until": "2026-06-10"}
            self.assertEqual(MockSource(Path(a)).call("list-records", p), MockSource(Path(b)).call("list-records", p))


if __name__ == "__main__":
    unittest.main()
