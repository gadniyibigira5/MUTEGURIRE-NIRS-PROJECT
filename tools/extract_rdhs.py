#!/usr/bin/env python3
"""Extract district indicator cells from an RDHS 2025 PDF; review output before use."""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
import pdfplumber

DISTRICTS = ["Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara", "Nyaruguru", "Huye", "Nyamagabe", "Ruhango", "Muhanga", "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu", "Ngororero", "Rusizi", "Nyamasheke", "Rulindo", "Gakenke", "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera"]
INDICATORS = {
    "st": [r"stunt", r"height.for.age", r"too short"],
    "anc": [r"four or more antenatal", r"4\+? antenatal", r"anc\s*4", r"antenatal care.*4"],
    "pnc": [r"postnatal", r"post.natal", r"check.*within 2 days"],
    "teen": [r"teenage childbearing", r"women age 15.?19.*begun childbearing", r"adolescent fertility"],
    "un": [r"unmet need", r"family planning.*unmet"]
}

def page_selection(spec: str | None, total: int) -> set[int]:
    """Return zero-based page indexes; --pages accepts 1-based values like 3-8,12 or all."""
    if not spec or spec.strip().lower() == "all": return set(range(total))
    out: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1); start, end = int(a), int(b)
            if start < 1 or end < start: raise ValueError(f"Invalid page range: {part}")
            out.update(range(start - 1, min(end, total)))
        else:
            p = int(part)
            if p < 1: raise ValueError("Page numbers are 1-based and must be positive")
            if p <= total: out.add(p - 1)
    return out

def parse_cell(cell: object) -> dict | None:
    """Parse numeric values, optionally wrapped in parentheses for low reliability."""
    if cell is None: return None
    text = str(cell).strip().replace("\u00a0", " ")
    if not text or text in {"-", "—", "–", "...", "..", "*", "**", "na", "n/a"}: return None
    low = bool(re.search(r"\([^)]*\d", text))
    match = re.search(r"\(?\s*(-?\d+(?:[.,]\d+)?)\s*\)?", text)
    if not match: return None
    try: value = float(match.group(1).replace(",", "."))
    except ValueError: return None
    if value < 0 or value > 100: return None
    return {"value": value, "low_reliability": low}

def canonical_name(raw: object) -> str | None:
    value = re.sub(r"\s+", " ", str(raw or "")).strip().strip("*†‡ ")
    return next((d for d in DISTRICTS if value.casefold() == d.casefold()), None)

def indicator_for(text: str) -> str | None:
    low = text.casefold()
    matches = [key for key, patterns in INDICATORS.items() if any(re.search(p, low) for p in patterns)]
    return matches[0] if len(matches) == 1 else None

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, help="Path to the manually downloaded RDHS 2025 PDF")
    parser.add_argument("--pages", default="all", help="1-based pages/ranges, e.g. 20-40,55; default all")
    parser.add_argument("--out", default="tools/out/rdhs_extracted.json", help="Output JSON path")
    args = parser.parse_args()
    pdf_path = Path(args.pdf)
    if not pdf_path.is_file(): parser.error(f"PDF not found: {pdf_path}")
    result: dict[str, dict] = {name: {k: None for k in INDICATORS} for name in DISTRICTS}
    unmatched: set[str] = set(); matched_cells = 0; tables_seen = 0
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages = page_selection(args.pages, len(pdf.pages))
            for page_idx, page in enumerate(pdf.pages):
                if page_idx not in pages: continue
                page_text = page.extract_text() or ""
                for table in (page.extract_tables() or []):
                    if not table: continue
                    tables_seen += 1
                    table_text = " ".join(str(c or "") for row in table[:4] for c in row)
                    indicator = indicator_for(table_text) or indicator_for(page_text)
                    if not indicator: continue
                    for row in table:
                        if not row: continue
                        raw_name = row[0]
                        name = canonical_name(raw_name)
                        if not name:
                            candidate = re.sub(r"\s+", " ", str(raw_name or "")).strip()
                            if candidate and re.search(r"[A-Za-z]", candidate) and len(candidate) < 45 and candidate.casefold() not in {"district", "province", "total", "urban", "rural", "residence"}:
                                unmatched.add(candidate)
                            continue
                        # Prefer the first numeric cell after the district label; table-specific column choice requires manual review.
                        cells = [parse_cell(c) for c in row[1:]]
                        cell = next((c for c in cells if c is not None), None)
                        if cell is None: continue
                        if result[name][indicator] is None:
                            result[name][indicator] = cell; matched_cells += 1
    except (ValueError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr); return 2
    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    nonempty = sum(v is not None for district in result.values() for v in district.values())
    print(f"Pages scanned: {len(pages)} | tables seen: {tables_seen} | district-indicator cells extracted: {nonempty}/150")
    print(f"Output: {out}")
    if unmatched:
        print("District-like names not matching the canonical 30-name list:")
        for name in sorted(unmatched, key=str.casefold): print(f"  - {name}")
    else: print("No unmatched district-like names found.")
    print("REVIEW REQUIRED: extraction is heuristic. Confirm table, column, year, denominator, and reliability against the PDF before treating values as evidence.")
    return 0

if __name__ == "__main__": raise SystemExit(main())
