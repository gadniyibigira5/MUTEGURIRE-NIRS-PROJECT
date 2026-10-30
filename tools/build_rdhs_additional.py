
import json
from pathlib import Path

OUTPUT = Path("rdhs_additional_indicators.json")
SOURCE = "RDHS 2025 DISTRICTS PROFILE_ EASTERN PROVINCE_ Final.pdf"

# Values are candidates transcribed from the report.
# They must be checked against the original tables and figures.

districts = [
    "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza",
    "Kirehe", "Ngoma", "Bugesera"
]

data = {
    "source": SOURCE,
    "survey_year": 2025,
    "review_status": "REQUIRES_MANUAL_VERIFICATION",
    "units": "percent unless otherwise stated",
    "geographic_scope": "Eastern Province, Rwanda",
    "districts": districts,
    "indicators": {
        "maternal_care": {
            "source": "table_8",
            "pdf_page": 88,
            "values": {
                "Rwamagana": [97.9, 96.2, 96.2],
                "Nyagatare": [98.0, 96.1, 96.1],
                "Gatsibo": [98.0, 96.0, 96.9],
                "Kayonza": [97.9, 98.4, 98.4],
                "Kirehe": [93.9, 98.7, 100.0],
                "Ngoma": [76.3, 97.7, 98.6],
                "Bugesera": [100.0, 100.0, 100.0]
            },
            "columns": [
                "anc_skilled_provider",
                "facility_delivery",
                "skilled_delivery"
            ]
        },
        "child_nutrition": {
            "source": "table_10",
            "pdf_page": 90,
            "values": {
                "Rwamagana": [19.2, 1.1, 6.2],
                "Nyagatare": [27.8, 1.1, 7.4],
                "Gatsibo": [29.4, 0.8, 5.8],
                "Kayonza": [26.1, 0.8, 7.3],
                "Kirehe": [31.7, 0.2, 8.8],
                "Ngoma": [26.9, 1.1, 12.4],
                "Bugesera": [20.8, 2.2, 4.7]
            },
            "columns": ["stunted", "wasted", "underweight"]
        },
        "antenatal_care_4plus": {
            "source": "figure_5_2a",
            "pdf_page": 44,
            "unit": "percent",
            "values": {
                "Rwamagana": 84.5,
                "Nyagatare": 80.1,
                "Gatsibo": 72.1,
                "Kayonza": 78.7,
                "Kirehe": 84.0,
                "Ngoma": 54.5,
                "Bugesera": 84.8,
                "Eastern Province": 77.4,
                "Rwanda": 77.5
            }
        },
        "first_antenatal_visit_timing": {
            "source": "figure_5_2b",
            "pdf_page": 45,
            "unit": "percent",
            "columns": ["before_4_months", "months_4_to_6", "month_7_or_later"],
            "values": {
                "Rwamagana": [75.2, 18.6, 4.1],
                "Nyagatare": [68.0, 25.1, 3.7],
                "Gatsibo": [65.2, 28.2, 3.6],
                "Kayonza": [66.3, 31.5, 1.1],
                "Kirehe": [75.2, 17.5, 0.0],
                "Ngoma": [49.4, 23.1, 3.8],
                "Bugesera": [65.5, 30.8, 3.8],
                "Eastern Province": [66.5, 25.3, 3.0],
                "Rwanda": [67.0, 24.7, 3.6]
            },
            "note": "Categories may not total 100% because of other or missing responses."
        },
        "postnatal_care_within_two_days": {
            "source": "figure_5_6",
            "pdf_page": 48,
            "unit": "percent",
            "columns": ["mothers", "newborns"],
            "values": {
                "Rwamagana": [80.1, 85.6],
                "Nyagatare": [62.7, 67.6],
                "Gatsibo": [65.5, 69.9],
                "Kayonza": [43.0, 47.7],
                "Kirehe": [80.7, 87.0],
                "Ngoma": [49.8, 50.0],
                "Bugesera": [65.3, 70.6],
                "Eastern Province": [65.3, 70.6],
                "Rwanda": [68.1, 71.7]
            },
            "review_note": "The narrative and chart appear inconsistent about the lowest newborn PNC value. Check the original figure."
        },
        "family_planning_total_demand": {
            "source": "figure_4_2",
            "pdf_page": 39,
            "unit": "percent",
            "values": {
                "Rwamagana": 78.2,
                "Nyagatare": 77.9,
                "Gatsibo": 78.8,
                "Kayonza": 74.3,
                "Kirehe": 76.0,
                "Ngoma": 81.8,
                "Bugesera": 74.1,
                "Eastern Province": 77.5,
                "Rwanda": 77.7
            }
        },
        "family_planning_demand_satisfied": {
            "source": "figure_4_3",
            "pdf_page": 40,
            "unit": "percent",
            "columns": [
                "total_demand_satisfied",
                "demand_satisfied_by_modern_methods"
            ],
            "values": {
                "Rwamagana": [89.1, 81.5],
                "Nyagatare": [85.5, 78.9],
                "Gatsibo": [91.8, 85.5],
                "Kayonza": [87.0, 82.0],
                "Kirehe": [86.1, 82.1],
                "Ngoma": [85.0, 81.9],
                "Bugesera": [79.0, 77.1],
                "Eastern Province": [86.4, 81.3],
                "Rwanda": [87.0, 82.0]
            },
            "review_note": "Chart label alignment and rounding require manual checking. These district pairings are provisional."
        },
        "family_planning_unmet_and_met_need": {
            "source": "figure_4_4",
            "pdf_page": 40,
            "unit": "percent",
            "columns": [
                "unmet_need_spacing",
                "unmet_need_limiting",
                "unmet_need_total",
                "met_need_total"
            ],
            "values": {
                "Rwamagana": [3.5, 4.1, 7.6, 44.9],
                "Nyagatare": [3.3, 3.2, 6.5, 43.4],
                "Gatsibo": [2.9, 1.6, 4.5, 50.4],
                "Kayonza": [4.1, 3.8, 7.9, 44.9],
                "Kirehe": [2.1, 5.1, 7.2, 45.8],
                "Ngoma": [4.1, 2.4, 6.5, 53.2],
                "Bugesera": [3.8, 6.5, 10.4, 39.8],
                "Eastern Province": [3.4, 3.8, 7.2, 45.6],
                "Rwanda": [3.5, 3.1, 6.6, 44.1]
            },
            "review_note": "Candidate chart transcription. Preserve reported totals; do not recalculate from rounded components."
        },
        "teenage_childbearing": {
            "source": "figure_3_4",
            "pdf_page": 37,
            "unit": "percent",
            "indicator": "Women aged 15-19 who have begun childbearing",
            "values": {
                "Rwamagana": 14.6,
                "Nyagatare": 10.6,
                "Gatsibo": 14.4,
                "Kayonza": 14.5,
                "Kirehe": 6.4,
                "Ngoma": 19.2,
                "Bugesera": 8.4,
                "Eastern Province": 12.1,
                "Rwanda": 8.1
            }
        },
        "fertility_rates": {
            "source": "figure_3_5",
            "pdf_page": 37,
            "unit": "births per woman",
            "columns": ["observed_total_fertility_rate", "wanted_total_fertility_rate"],
            "values": {
                "Rwamagana": [4.0, 2.8],
                "Nyagatare": [4.4, 3.2],
                "Gatsibo": [4.0, 2.8],
                "Kayonza": [4.2, 3.3],
                "Kirehe": [3.7, 2.8],
                "Ngoma": [4.0, 3.1],
                "Bugesera": [3.7, 3.0],
                "Eastern Province": [4.0, 3.1],
                "Rwanda": [3.7, 2.8]
            },
            "review_note": "Candidate chart transcription; verify against Figure 3.5 before use."
        }
    },
    "verification_policy": {
        "status": "CANDIDATE_UNVERIFIED",
        "instruction": "Do not publish or use these values for official decisions until manually checked against the cited report pages.",
        "original_extraction_preserved": "rdhs_verified_tables.json"
    }
}

OUTPUT.write_text(
    json.dumps(data, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print(f"Created: {OUTPUT}")
print(f"Indicators: {len(data['indicators'])}")
print(f"Districts: {len(districts)}")
print("Status: CANDIDATE_UNVERIFIED")
