import json
import math

path = "rdhs_additional_indicators.json"

with open(path, encoding="utf-8") as f:
    data = json.load(f)

expected = [
    "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza",
    "Kirehe", "Ngoma", "Bugesera",
    "Eastern Province", "Rwanda"
]

print("DATASET QUALITY CHECK")
print("-" * 45)

indicators = data.get("indicators", {})
print("Indicator count:", len(indicators))
print("Top-level review status:", data.get("review_status"))

for name, indicator in indicators.items():
    values = indicator.get("values", {})
    missing = [area for area in expected if area not in values]
    extra = [area for area in values if area not in expected]

    numbers = []
    for value in values.values():
        items = value if isinstance(value, list) else [value]
        numbers.extend(items)

    invalid = [
        value for value in numbers
        if not isinstance(value, (int, float))
        or isinstance(value, bool)
        or not math.isfinite(value)
    ]

    status = indicator.get("verification_status", "MISSING")
    result = (
        "PASS" if not missing and not extra and not invalid
        and status == "MANUALLY_VERIFIED" else "CHECK"
    )

    print(f"{name}: {result}")
    if missing:
        print("  Missing areas:", missing)
    if extra:
        print("  Unexpected areas:", extra)
    if invalid:
        print("  Invalid values:", invalid)
    if status != "MANUALLY_VERIFIED":
        print("  Verification status:", status)

print("-" * 45)
pnc = indicators.get("postnatal_care_within_two_days", {})
print("Postnatal care review note:", pnc.get("review_note", "None"))
print("Postnatal care verification note:", pnc.get("verification_note", "None"))
print("Verification policy:", data.get("verification_policy", {}))
