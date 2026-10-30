
#!/usr/bin/env python3
"""Extract verified RDHS Table 8 and Table 10 district indicators for review."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pdfplumber


DISTRICTS = [
    "Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara",
    "Nyaruguru", "Huye", "Nyamagabe", "Ruhango", "Muhanga",
    "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu",
    "Ngororero", "Rusizi", "Nyamasheke", "Rulindo", "Gakenke",
    "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare",
    "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera"
]

TABLES = {
    "table_8": {
        "required_headers": [
            r"ANC.*skilled provider",
            r"delivery.*health facilit",
            r"delivered.*skilled provider",
        ],
        "indicators": [
            "anc_skilled_provider",
            "facility_delivery",
            "skilled_delivery",
        ],
    },
    "table_10": {
        "required_headers": [
            r"stunted",
            r"wasted",
            r"underweight",
        ],
        "indicators": [
            "stunted",
            "wasted",
            "underweight",
        ],
    },
}


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def district_name(value: object) -> str | None:
    name = clean_text(value).strip("*†‡ ")
    for district in DISTRICTS:
        if name.casefold() == district.casefold():
            return district
    return None


def parse_number(value: object) -> dict | None:
    """Read a percentage while preserving low-reliability parentheses."""
    text = clean_text(value).replace("\u00a0", " ")

    if not text or text.casefold() in {
        "-", "—", "–", "...", "..", "*", "**", "na", "n/a"
    }:
        return None

    low_reliability = bool(re.search(r"\([^)]*\d", text))

    match = re.search(r"\(?\s*(-?\d+(?:[.,]\d+)?)", text)
    if not match:
        return None

    try:
        number = float(match.group(1).replace(",", "."))
    except ValueError:
        return None

    if not 0 <= number <= 100:
        return None

    return {
        "value": number,
        "low_reliability": low_reliability,
        "raw": text,
    }


def identify_table(table: list[list[object]]) -> str | None:
    """Identify actual RDHS data tables, not figures or charts."""

    text = " ".join(
        clean_text(cell)
        for row in table
        for cell in row
    ).casefold()

    # Table 8: require the actual three column headings.
    if (
        "table 8" in text
        and "anc from a skilled provider" in text
        and "delivery in a health facility" in text
        and "delivered by a skilled provider" in text
    ):
        return "table_8"

    # Table 10: require the actual nutrition table headings.
    if (
        "table 10" in text
        and "stunted" in text
        and "wasted" in text
        and "underweight" in text
    ):
        return "table_10"

    return None

def extract_table_rows(
    table: list[list[object]],
    table_id: str,
    pdf_page: int,
) -> dict:
    config = TABLES[table_id]
    indicators = config["indicators"]

    extracted = {}
    rejected_rows = []

    for row in table:
        if not row:
            continue

        name = district_name(row[0])

        if not name:
            continue

        numeric_cells = [
            parse_number(cell)
            for cell in row[1:]
        ]

        numeric_cells = [
            cell for cell in numeric_cells
            if cell is not None
        ]

        if len(numeric_cells) < len(indicators):
            rejected_rows.append({
                "district": name,
                "raw_row": [clean_text(cell) for cell in row],
                "reason": "Not enough numeric columns",
            })
            continue

        values = {}

        for index, indicator in enumerate(indicators):
            values[indicator] = {
                **numeric_cells[index],
                "source": table_id,
                "pdf_page": pdf_page,
            }

        extracted[name] = values

    return {
        "districts": extracted,
        "rejected_rows": rejected_rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)

    parser.add_argument("--pdf", required=True)
    parser.add_argument(
        "--out",
        default="rdhs_verified_tables.json",
    )

    args = parser.parse_args()
    pdf_path = Path(args.pdf)

    if not pdf_path.is_file():
        parser.error(f"PDF not found: {pdf_path}")

    results = {
        "source": pdf_path.name,
        "survey_year": 2025,
        "review_status": "REQUIRES_MANUAL_VERIFICATION",
        "units": "percent",
        "tables": {
            "table_8": {},
            "table_10": {},
        },
        "rejected_rows": [],
        "warnings": [],
    }

    tables_found = {"table_8": 0, "table_10": 0}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_index, page in enumerate(pdf.pages):
                for table in page.extract_tables() or []:
                    if not table:
                        continue

                    table_id = identify_table(table)

                    if table_id is None:
                        continue

                    tables_found[table_id] += 1

                    extracted = extract_table_rows(
                        table,
                        table_id,
                        page_index + 1,
                    )

                    for district, values in extracted["districts"].items():
                        if district in results["tables"][table_id]:
                            results["warnings"].append(
                                f"Duplicate district {district} in {table_id}; "
                                "the later row was not used."
                            )
                            continue

                        results["tables"][table_id][district] = values

                    results["rejected_rows"].extend(
                        extracted["rejected_rows"]
                    )

    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    for table_id, count in tables_found.items():
        if count == 0:
            results["warnings"].append(
                f"{table_id} was not identified. "
                "Check the PDF table headers or extraction layout."
            )

    for table_id, districts in results["tables"].items():
        missing = sorted(
            set(DISTRICTS) - set(districts),
            key=str.casefold,
        )

        if missing:
            results["warnings"].append(
                f"{table_id} is missing districts: {', '.join(missing)}"
            )

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)

    output.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"PDF pages scanned: {len(pdf.pages)}")
    print(f"Table 8 matches: {tables_found['table_8']}")
    print(f"Table 10 matches: {tables_found['table_10']}")

    for table_id, districts in results["tables"].items():
        print(f"{table_id}: {len(districts)}/30 districts extracted")

    print(f"Output: {output.resolve()}")

    if results["warnings"]:
        print("\nWARNINGS:")
        for warning in results["warnings"]:
            print(f"- {warning}")

    print(
        "\nIMPORTANT: These are extracted candidates. "
        "Verify the column order and values against the original PDF "
        "before using them in the dashboard."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
