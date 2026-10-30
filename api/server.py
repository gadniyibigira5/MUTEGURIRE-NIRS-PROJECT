
"""Mutegurire API: grounded chat and human-reviewed PDF extraction candidates.

Run locally with:
    uvicorn api.server:app --reload --port 8000

Extracted values are never written into the live district dataset.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import urllib.error
import urllib.request
from typing import Any, BinaryIO
from pathlib import Path

import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# APPLICATION CONFIGURATION
# ---------------------------------------------------------

app = FastAPI(title="Mutegurire API", version="0.4.1")

# ---------------------------------------------------------
# RDHS ADDITIONAL INDICATORS
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

RDHS_ADDITIONAL_FILE = (
    PROJECT_ROOT / "rdhs_additional_indicators.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

DISTRICTS = [
    "Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara",
    "Nyaruguru", "Huye", "Nyamagabe", "Ruhango", "Muhanga",
    "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu",
    "Ngororero", "Rusizi", "Nyamasheke", "Rulindo", "Gakenke",
    "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare",
    "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera"
]

INDICATOR_PATTERNS = {
    "st": [
        r"\bstunting\b",
        r"\bstunted\b",
        r"chronic malnutrition",
        r"height[- ]for[- ]age"
    ],
    "pov": [
        r"\bpoverty\b",
        r"poor population",
        r"poverty headcount"
    ],
    "anc": [
        r"\bantenatal\b",
        r"four or more visits",
        r"4\+?\s*antenatal",
        r"\bANC\s*4\b"
    ],
    "pnc": [
        r"\bpostnatal\b",
        r"post.natal check",
        r"newborn check"
    ],
    "teen": [
        r"teenage childbearing",
        r"adolescent birth",
        r"women age 15.?19.*childbearing"
    ],
    "un": [
        r"unmet need",
        r"family planning.*unmet"
    ],
}

NON_STUNTING_NUTRITION_TERMS = [
    r"\bunderweight\b",
    r"\bwasting\b",
    r"dietary diversity",
    r"meal frequency",
    r"minimum acceptable diet",
    r"feeding practices",
    r"\banemia\b",
    r"\banaemia\b"
]

MAX_PDF_BYTES = 15 * 1024 * 1024
MAX_PDF_PAGES = 200
MAX_CANDIDATES = 500
UPLOAD_CHUNK_SIZE = 1024 * 1024


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: str = "en"
    districts: list[dict[str, Any]] = Field(default_factory=list, max_length=30)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=10)


# ---------------------------------------------------------
# AI CHAT
# ---------------------------------------------------------

def _model_answer(payload: ChatRequest) -> str | None:
    """Call an OpenAI-compatible chat-completions endpoint."""

    key = os.getenv("OPENAI_API_KEY", "").strip()

    if not key:
        return None

    base = os.getenv(
        "OPENAI_BASE_URL",
        "https://api.openai.com/v1"
    ).rstrip("/")

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    safe_rows = []

    allowed = {
        "n", "p", "st", "st20", "pov", "anc",
        "pnc", "teen", "un", "pop", "u5", "t"
    }

    for row in payload.districts[:30]:
        safe_rows.append({
            key: row.get(key)
            for key in allowed
            if key in row
        })

    system = (
        "You are Mutegurire, a Rwanda maternal and child health "
        "district-planning assistant. "
        "Use only the supplied district data and context. "
        "Never invent values, sources, causes, or forecasts. "
        "Say when a value is missing. "
        "Explain whether a value is a proxy or unverified when "
        "the supplied context says so. "
        "Recommendations are hypotheses for local review, "
        "not proven interventions or automatic funding decisions. "
        "Distinguish percentage points from percent. "
        "Avoid individual medical advice. "
        "Keep answers concise, structured, and actionable. "
        "If asked outside the data, explain the limitation. "
        "Respond in Kinyarwanda if language is 'rw', "
        "otherwise English."
    )

    messages = [
        {
            "role": "system",
            "content": (
                system
                + "\nDistrict data JSON:\n"
                + json.dumps(safe_rows, ensure_ascii=False)
            )
        }
    ]

    for item in payload.history[-8:]:
        role = item.get("role", "user")
        content = str(item.get("content", ""))[:2500]

        if role in {"user", "assistant"} and content:
            messages.append({
                "role": role,
                "content": content
            })

    messages.append({
        "role": "user",
        "content": payload.question
    })

    body = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 900
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8"))

        answer = result["choices"][0]["message"]["content"]

        return (
            answer.strip()
            if isinstance(answer, str) and answer.strip()
            else None
        )

    except (
        urllib.error.URLError,
        urllib.error.HTTPError,
        TimeoutError,
        KeyError,
        IndexError,
        ValueError,
        json.JSONDecodeError
    ):
        return None


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "ai_configured": bool(
            os.getenv("OPENAI_API_KEY", "").strip()
        )
    }
@app.get("/api/rdhs/indicators")
def get_rdhs_indicators() -> dict[str, Any]:
    """
    Return additional RDHS indicators.

    These values are candidates requiring manual verification.
    They are not automatically added to the live district dataset.
    """

    if not RDHS_ADDITIONAL_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="RDHS additional indicators dataset was not found."
        )

    try:
        with RDHS_ADDITIONAL_FILE.open(
            "r",
            encoding="utf-8"
        ) as file:
            dataset = json.load(file)

    except (OSError, json.JSONDecodeError):
        raise HTTPException(
            status_code=500,
            detail="Could not read the RDHS indicators dataset."
        )

    return dataset

@app.post("/api/chat")
def chat(payload: ChatRequest) -> dict[str, Any]:

    answer = _model_answer(payload)

    if not answer:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI model is not configured or did not respond. "
                "Use the local data assistant."
            )
        )

    return {
        "answer": answer,
        "model_used": os.getenv(
            "OPENAI_MODEL",
            "gpt-4.1-mini"
        ),
        "grounded_in": "current dashboard district values"
    }


# ---------------------------------------------------------
# PDF EXTRACTION HELPERS
# ---------------------------------------------------------

def canonical_district(text: str) -> str | None:
    cleaned = re.sub(
        r"\s+",
        " ",
        str(text or "")
    ).strip(" *†‡:;,.|\t")

    return next(
        (
            name for name in DISTRICTS
            if cleaned.casefold() == name.casefold()
        ),
        None
    )


def indicator_for(text: str) -> str | None:
    """Return an indicator only when its wording is unambiguous."""

    text = str(text or "")

    # Do not classify other nutrition measurements as stunting.
    if any(
        re.search(pattern, text, re.I)
        for pattern in NON_STUNTING_NUTRITION_TERMS
    ):
        return None

    matches = [
        key
        for key, patterns in INDICATOR_PATTERNS.items()
        if any(
            re.search(pattern, text, re.I)
            for pattern in patterns
        )
    ]

    return matches[0] if len(matches) == 1 else None


def find_district_mentions(text: str) -> list[str]:
    """Find all district names mentioned in a piece of text."""

    found = []

    for name in DISTRICTS:
        if re.search(
            rf"(?<![A-Za-z]){re.escape(name)}(?![A-Za-z])",
            text,
            re.I
        ):
            found.append(name)

    return found


def split_sentences(text: str) -> list[str]:
    """Split extracted PDF text into smaller sentence-level units."""

    text = re.sub(r"\s+", " ", str(text or "")).strip()

    return [
        part.strip()
        for part in re.split(r"(?<=[.!?])\s+", text)
        if part.strip()
    ]


def parse_percentages(text: str) -> list[float]:
    """Extract percentages only when an explicit % sign exists."""

    found = []

    for match in re.finditer(
        r"(?<![\w.])(\d{1,2}(?:[.,]\d{1,2})?)\s*%",
        text
    ):
        value = float(
            match.group(1).replace(",", ".")
        )

        if 0 <= value <= 100:
            found.append(value)

    return found


def parse_numeric_cells(cells: list[Any]) -> list[float]:
    """Parse percentage-like table cells."""

    values = []

    for cell in cells:

        text = (
            str(cell or "")
            .strip()
            .replace("\u00a0", " ")
            .replace(",", ".")
        )

        if not re.fullmatch(
            r"\(?\s*\d{1,2}(?:\.\d{1,2})?\s*%?\)?",
            text
        ):
            continue

        number = float(
            re.sub(r"[%()\s]", "", text)
        )

        if 0 <= number <= 100:
            values.append(number)

    return values


# ---------------------------------------------------------
# PDF EXTRACTION ENGINE
# ---------------------------------------------------------

def extract_candidates(
    pdf_file: BinaryIO
) -> tuple[list[dict[str, Any]], list[str], int]:

    candidates: list[dict[str, Any]] = []
    warnings: list[str] = []

    seen: set[tuple[str, str, float, int]] = set()

    def add_candidate(
        district: str,
        metric: str,
        value: float,
        page_number: int,
        source_text: str
    ) -> None:

        if len(candidates) >= MAX_CANDIDATES:
            return

        key = (
            district,
            metric,
            value,
            page_number
        )

        if key in seen:
            return

        candidates.append({
            "district": district,
            "indicator": metric,
            "value": value,
            "page": page_number,
            "source_text": re.sub(
                r"\s+",
                " ",
                source_text
            )[:240],
            "confidence": "candidate—review required"
        })

        seen.add(key)

    with pdfplumber.open(pdf_file) as pdf:

        page_count = len(pdf.pages)

        if page_count > MAX_PDF_PAGES:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"PDF has {page_count} pages; "
                    f"maximum is {MAX_PDF_PAGES}."
                )
            )

        for page_number, page in enumerate(
            pdf.pages,
            start=1
        ):

            try:
                text = page.extract_text() or ""

                if not text.strip():
                    warnings.append(
                        f"Page {page_number}: no selectable text; "
                        "scanned pages need OCR or manual entry."
                    )
                    continue

                # -----------------------------------------
                # TABLE EXTRACTION
                # -----------------------------------------

                try:
                    tables = page.extract_tables() or []
                except Exception:
                    tables = []

                for table in tables:

                    if len(candidates) >= MAX_CANDIDATES:
                        break

                    if not table:
                        continue

                    header_text = " ".join(
                        " ".join(
                            str(cell or "")
                            for cell in row
                        )
                        for row in table[:3]
                    )

                    # Indicator must be identifiable from
                    # the table headings themselves.
                    table_metric = indicator_for(header_text)

                    if not table_metric:
                        continue

                    for row in table:

                        if len(candidates) >= MAX_CANDIDATES:
                            break

                        if not row:
                            continue

                        district = canonical_district(row[0])

                        if not district:
                            continue

                        row_text = " | ".join(
                            str(cell or "")
                            for cell in row
                        )

                        values = parse_numeric_cells(
                            list(row[1:])
                        )

                        # Never guess which column represents
                        # the target indicator.
                        if len(values) != 1:
                            continue

                        add_candidate(
                            district=district,
                            metric=table_metric,
                            value=values[0],
                            page_number=page_number,
                            source_text=row_text
                        )

                # -----------------------------------------
                # SENTENCE-LEVEL TEXT EXTRACTION
                # -----------------------------------------

                for sentence in split_sentences(text):

                    if len(candidates) >= MAX_CANDIDATES:
                        break

                    districts = find_district_mentions(
                        sentence
                    )

                    # Sentence must identify exactly one district.
                    if len(districts) != 1:
                        continue

                    district = districts[0]

                    metric = indicator_for(sentence)

                    if not metric:
                        continue

                    values = parse_percentages(sentence)

                    # Sentence must contain exactly one percentage.
                    if len(values) != 1:
                        continue

                    add_candidate(
                        district=district,
                        metric=metric,
                        value=values[0],
                        page_number=page_number,
                        source_text=sentence
                    )

            finally:
                # Release page-level cached objects.
                page.close()

        if len(candidates) >= MAX_CANDIDATES:
            warnings.append(
                "The candidate limit was reached. "
                "Some possible results may not have been included."
            )

        if not candidates:
            warnings.append(
                "No unambiguous district/indicator/percentage "
                "rows found. Check table layout, PDF text layer, "
                "or indicator wording."
            )

    return candidates, warnings, page_count


# ---------------------------------------------------------
# PDF UPLOAD ENDPOINT
# ---------------------------------------------------------

@app.post("/api/documents/preview")
async def preview_pdf(
    file: UploadFile = File(...)
) -> dict[str, Any]:

    filename = (
        file.filename or "upload.pdf"
    ).lower()

    if (
        not filename.endswith(".pdf")
        and file.content_type != "application/pdf"
    ):
        raise HTTPException(
            status_code=415,
            detail="Please upload a PDF file."
        )

    temp_path = None

    try:

        # ---------------------------------------------
        # SAVE UPLOAD IN SMALL CHUNKS
        # ---------------------------------------------

        total_size = 0

        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=".pdf",
            delete=False
        ) as temporary_file:

            temp_path = temporary_file.name

            while True:

                chunk = await file.read(
                    UPLOAD_CHUNK_SIZE
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_PDF_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "PDF exceeds the 15 MB upload limit."
                        )
                    )

                temporary_file.write(chunk)

        if total_size < 5:
            raise HTTPException(
                status_code=415,
                detail="The uploaded PDF is empty or invalid."
            )

        # ---------------------------------------------
        # VALIDATE PDF SIGNATURE
        # ---------------------------------------------

        with open(temp_path, "rb") as pdf_file:

            signature = pdf_file.read(5)

            if signature != b"%PDF-":
                raise HTTPException(
                    status_code=415,
                    detail=(
                        "The uploaded file does not appear "
                        "to be a valid PDF."
                    )
                )

            pdf_file.seek(0)

            # -----------------------------------------
            # EXTRACT CANDIDATES
            # -----------------------------------------

            candidates, warnings, page_count = (
                extract_candidates(pdf_file)
            )

        return {
            "filename": os.path.basename(filename),
            "page_count": page_count,
            "candidates": candidates,
            "warnings": warnings,
            "review_required": True,
            "published": False,
            "message": (
                "Preview only. Extracted values have not "
                "been written to the live dataset."
            )
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=422,
            detail=(
                "Could not read this PDF. It may be damaged, "
                "encrypted, or require OCR."
            )
        ) from exc

    finally:

        await file.close()

        # ---------------------------------------------
        # DELETE TEMPORARY PDF
        # ---------------------------------------------

        if temp_path and os.path.exists(temp_path):

            try:
                os.remove(temp_path)
            except OSError:
                pass
