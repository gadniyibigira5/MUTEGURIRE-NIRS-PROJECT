#!/usr/bin/env python3
"""Compare prototype district values with extracted NISR values and write validation artifacts."""
from __future__ import annotations
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ["Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara", "Nyaruguru", "Huye", "Nyamagabe", "Ruhango", "Muhanga", "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu", "Ngororero", "Rusizi", "Nyamasheke", "Rulindo", "Gakenke", "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera"]
INDICATORS = ["st", "pov", "anc", "pnc", "teen", "un", "st20"]

def load_json(path: Path) -> dict:
    if not path.exists(): return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"Cannot read valid JSON from {path}: {exc}") from exc

def load_districts(path: Path) -> list[dict[str, Any]]:
    """Extract the JSON-compatible array from `export const districts = [...]`; no Node needed."""
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export\s+const\s+districts\s*=\s*(\[.*?\])\s*;", text, re.S)
    if not match: raise ValueError(f"Could not locate districts array in {path}")
    try: data = json.loads(match.group(1))
    except json.JSONDecodeError as exc: raise ValueError(f"District array is not JSON-compatible: {exc}") from exc
    if not isinstance(data, list): raise ValueError("District data must be a JSON array")
    return data

def cell_value(obj: Any) -> tuple[float | None, bool]:
    if isinstance(obj, dict):
        value = obj.get("value")
        try: return (float(value), bool(obj.get("low_reliability", False))) if value is not None else (None, bool(obj.get("low_reliability", False)))
        except (ValueError, TypeError): return None, bool(obj.get("low_reliability", False))
    if isinstance(obj, (int, float)): return float(obj), False
    return None, False

def record(value: float | None, status: str, sources: list[str], notes: str, low: bool = False, **extra: Any) -> dict:
    return {"value": value, "status": status, "sources": sources, "notes": notes, "low_reliability": bool(low), **extra}

def build_record(legacy_value: Any, rdhs_cell: Any, eicv_cell: Any, indicator: str) -> dict:
    legacy, legacy_low = cell_value(legacy_value)
    rdhs, rdhs_low = cell_value(rdhs_cell)
    eicv, eicv_low = cell_value(eicv_cell)
    if indicator == "pov":
        candidates = [("legacy", legacy), ("eicv", eicv)]
        primary = eicv
    else:
        candidates = [("legacy", legacy), ("rdhs", rdhs)]
        primary = rdhs
    present = [(source, value) for source, value in candidates if value is not None]
    low = legacy_low or rdhs_low or eicv_low
    if len(present) >= 2:
        first_source, first_value = present[0]
        second_source, second_value = present[1]
        if abs(first_value - second_value) <= 2.0:
            # Newer source is preferred: RDHS for health indicators, EICV7 for poverty.
            chosen = primary if primary is not None else present[-1][1]
            return record(chosen, "validated", [s for s, _ in present], f"Sources agree within 2.0 percentage points ({first_source}={first_value:g}; {second_source}={second_value:g}); preferred newer source used. Agreement is not proof of statistical significance or causation.", low)
        chosen = rdhs if indicator != "pov" and rdhs is not None else eicv if indicator == "pov" and eicv is not None else present[-1][1]
        return record(chosen, "discrepancy", [s for s, _ in present], f"Values differ by more than 2.0 percentage points: {first_source}={first_value:g}; {second_source}={second_value:g}. Preferred primary source retained; manually verify definitions, years, and table columns.", low, alternatives={s: v for s, v in present})
    if len(present) == 1:
        source, value = present[0]
        explanation = "carried from prototype; not yet cross-checked against NISR tables" if source == "legacy" else f"only extracted {source} value is available; cross-check not possible"
        return record(value, "single_source", [source], explanation, low)
    return record(None, "missing", [], "No usable value found in the prototype or extracted source files; value intentionally left missing.", False)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--districts", default=str(ROOT / "src/data/districts.js"), help="Path to districts.js")
    parser.add_argument("--rdhs", default=str(ROOT / "tools/out/rdhs_extracted.json"), help="Extracted RDHS JSON; absent file is treated as no extracted source")
    parser.add_argument("--eicv", default=str(ROOT / "tools/out/eicv_extracted.json"), help="Extracted EICV JSON; absent file is treated as no extracted source")
    parser.add_argument("--out", default=str(ROOT / "src/data/validation.json"), help="Validation JSON output path")
    parser.add_argument("--report", default=str(ROOT / "tools/out/validation_report.md"), help="Markdown report output path")
    args = parser.parse_args()
    try:
        legacy_districts = load_districts(Path(args.districts))
        rdhs_data, eicv_data = load_json(Path(args.rdhs)), load_json(Path(args.eicv))
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    legacy_by_name = {str(d.get("n")): d for d in legacy_districts}
    districts: dict[str, dict] = {}
    for name in CANONICAL:
        old = legacy_by_name.get(name, {})
        rdhs = rdhs_data.get(name, {}) if isinstance(rdhs_data.get(name, {}), dict) else {}
        eicv = eicv_data.get(name, {}) if isinstance(eicv_data.get(name, {}), dict) else {}
        indicators = {key: build_record(old.get(key), rdhs.get(key), eicv.get(key), key) for key in INDICATORS}
        u5 = old.get("u5")
        indicators["u5"] = record(float(u5) if isinstance(u5, (int, float)) else None, "proxy", ["legacy"] if u5 is not None else [], "province-share estimate, not a district projection", False)
        stunting, under_five = indicators["st"]["value"], indicators["u5"]["value"]
        burden = round(under_five * stunting / 100) if under_five is not None and stunting is not None else None
        indicators["burden"] = record(burden, "derived", ["u5", "st"] if burden is not None else [], "u5 proxy × st prevalence; not an official count", indicators["st"]["low_reliability"])
        districts[name] = indicators
    counts = {s: 0 for s in ["validated", "single_source", "discrepancy", "missing"]}
    for district in districts.values():
        for key in INDICATORS:
            status = district[key]["status"]
            if status in counts: counts[status] += 1
    payload = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "districts": districts, "summary": counts, "summary_note": "Counts cover the seven source indicators (st, pov, anc, pnc, teen, un, st20) across the 30 canonical districts; proxy and derived metrics are excluded."}
    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report = ["# Mutegurire data validation report", "", f"Generated: {payload['generated_at']}", "", "Counts cover seven source indicators per canonical district; proxy and derived metrics are excluded.", "", "**Important:** heuristic extraction is not verification. Review each source table, indicator definition, year, denominator, and column before official use.", ""]
    for key in INDICATORS:
        report += [f"## {key}", "", "| District | Value | Status | Source(s) | Notes |", "|---|---:|---|---|---|"]
        for name, values in districts.items():
            item = values[key]; value = "—" if item["value"] is None else str(item["value"])
            notes = item["notes"].replace("|", "\\|").replace("\n", " ")
            report.append(f"| {name} | {value} | {item['status']} | {', '.join(item['sources']) or '—'} | {notes} |")
        report.append("")
    report_path = Path(args.report); report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"Wrote {out}"); print(f"Wrote {report_path}"); print("Status counts (seven source indicators × 30 districts):")
    for status, count in counts.items(): print(f"  {status}: {count}")
    return 0

if __name__ == "__main__": raise SystemExit(main())
