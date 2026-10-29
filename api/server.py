"""Mutegurire API: grounded chat and human-reviewed PDF extraction candidates.

Run locally with: uvicorn api.server:app --reload --port 8000
Never writes extracted values into the live district dataset.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from io import BytesIO
from typing import Any

import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Mutegurire API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

DISTRICTS = [
    "Nyarugenge", "Gasabo", "Kicukiro", "Nyanza", "Gisagara", "Nyaruguru", "Huye", "Nyamagabe", "Ruhango", "Muhanga", "Kamonyi", "Karongi", "Rutsiro", "Rubavu", "Nyabihu", "Ngororero", "Rusizi", "Nyamasheke", "Rulindo", "Gakenke", "Musanze", "Burera", "Gicumbi", "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Bugesera"
]
INDICATOR_PATTERNS = {
    "st": [r"stunt", r"chronic malnutrition", r"linear growth"],
    "pov": [r"poverty", r"poor population", r"poverty headcount"],
    "anc": [r"antenatal", r"four or more visits", r"4\+? antenatal", r"anc 4"],
    "pnc": [r"postnatal", r"post.natal check", r"newborn check"],
    "teen": [r"teenage childbearing", r"adolescent birth", r"women age 15.?19.*childbearing"],
    "un": [r"unmet need", r"family planning.*unmet"],
}
MAX_PDF_BYTES = 15 * 1024 * 1024
MAX_PDF_PAGES = 200


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: str = "en"
    districts: list[dict[str, Any]] = Field(default_factory=list, max_length=30)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=10)


def _model_answer(payload: ChatRequest) -> str | None:
    """Call an OpenAI-compatible chat-completions endpoint using a server-side key."""
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    safe_rows = []
    allowed = {"n", "p", "st", "st20", "pov", "anc", "pnc", "teen", "un", "pop", "u5", "t"}
    for row in payload.districts[:30]:
        safe_rows.append({k: row.get(k) for k in allowed if k in row})
    system = (
        "You are Mutegurire, a Rwanda maternal and child health district-planning assistant. "
        "Use only the supplied district data and context. Never invent values, sources, causes, or forecasts. "
        "Say when a value is missing. Explain whether a value is a proxy or unverified when the supplied context says so. "
        "Recommendations are hypotheses for local review, not proven interventions or automatic funding decisions. "
        "Distinguish percentage points from percent. Avoid individual medical advice. Keep answers concise, structured, and actionable. "
        "If asked outside the data, explain the limitation. Respond in Kinyarwanda if language is 'rw', otherwise English."
    )
    messages = [{"role": "system", "content": system + "\nDistrict data JSON:\n" + json.dumps(safe_rows, ensure_ascii=False)}]
    for item in payload.history[-8:]:
        role = item.get("role", "user")
        content = str(item.get("content", ""))[:2500]
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": payload.question})
    body = json.dumps({"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 900}).encode()
    req = urllib.request.Request(
        f"{base}/chat/completions", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8"))
        answer = result["choices"][0]["message"]["content"]
        return answer.strip() if isinstance(answer, str) and answer.strip() else None
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, KeyError, IndexError, ValueError, json.JSONDecodeError):
        return None


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "ai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip())}


@app.post("/api/chat")
def chat(payload: ChatRequest) -> dict[str, Any]:
    answer = _model_answer(payload)
    if not answer:
        # Client keeps its local, deterministic assistant as a reliable fallback.
        raise HTTPException(status_code=503, detail="AI model is not configured or did not respond. Use the local data assistant.")
    return {"answer": answer, "model_used": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), "grounded_in": "current dashboard district values"}


def canonical_district(text: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip(" *†‡:;,.|\t")
    return next((name for name in DISTRICTS if cleaned.casefold() == name.casefold()), None)


def indicator_for(text: str) -> str | None:
    matches = [key for key, patterns in INDICATOR_PATTERNS.items() if any(re.search(pattern, text, re.I) for pattern in patterns)]
    return matches[0] if len(matches) == 1 else None


def parse_percentages(text: str) -> list[float]:
    # Text-only extraction requires an explicit % sign to reduce confusion with dates and counts.
    found = []
    for match in re.finditer(r"(?<![\w.])(\d{1,2}(?:[.,]\d{1,2})?)\s*%", text):
        value = float(match.group(1).replace(",", "."))
        if 0 <= value <= 100:
            found.append(value)
    return found


def parse_numeric_cells(cells: list[Any]) -> list[float]:
    """Parse table cells that contain a lone percentage-like number, even when % is in the header."""
    values: list[float] = []
    for cell in cells:
        text = str(cell or "").strip().replace("\u00a0", " ").replace(",", ".")
        if not re.fullmatch(r"\(?\s*\d{1,2}(?:\.\d{1,2})?\s*%?\)?", text):
            continue
        number = float(re.sub(r"[%()\s]", "", text))
        if 0 <= number <= 100:
            values.append(number)
    return values


def extract_candidates(pdf_bytes: bytes) -> tuple[list[dict[str, Any]], list[str], int]:
    candidates: list[dict[str, Any]] = []
    warnings: list[str] = []
    seen: set[tuple[str, str, float, int]] = set()
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        if len(pdf.pages) > MAX_PDF_PAGES:
            raise HTTPException(status_code=413, detail=f"PDF has {len(pdf.pages)} pages; maximum is {MAX_PDF_PAGES}.")
        for page_number, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            page_metric = indicator_for(text)
            if not text.strip():
                warnings.append(f"Page {page_number}: no selectable text; scanned pages need OCR or manual entry.")
                continue
            # Table extraction is intentionally conservative: accept a row only if the district is explicit,
            # exactly one percentage is present, and the page unambiguously names one supported indicator.
            try:
                tables = page.extract_tables() or []
            except Exception:
                tables = []
            for table in tables:
                header_text = " ".join(" ".join(str(cell or "") for cell in row) for row in (table or [])[:3])
                table_metric = indicator_for(header_text) or page_metric
                for row in table or []:
                    if not row:
                        continue
                    district = canonical_district(row[0])
                    if not district:
                        continue
                    row_text = " | ".join(str(cell or "") for cell in row)
                    metric = indicator_for(row_text) or table_metric
                    values = parse_numeric_cells(list(row[1:]))
                    if not values:
                        values = parse_percentages(row_text)
                    if metric and len(values) == 1:
                        key = (district, metric, values[0], page_number)
                        if key not in seen:
                            candidates.append({"district": district, "indicator": metric, "value": values[0], "page": page_number, "source_text": re.sub(r"\s+", " ", row_text)[:240], "confidence": "candidate—review required"})
                            seen.add(key)
            # Also handle text reports that put district, metric and value on one line.
            for line in text.splitlines():
                district = next((name for name in DISTRICTS if re.search(rf"(?<![A-Za-z]){re.escape(name)}(?![A-Za-z])", line, re.I)), None)
                if not district:
                    continue
                metric = indicator_for(line) or page_metric
                values = parse_percentages(line)
                if metric and len(values) == 1:
                    key = (district, metric, values[0], page_number)
                    if key not in seen:
                        candidates.append({"district": district, "indicator": metric, "value": values[0], "page": page_number, "source_text": re.sub(r"\s+", " ", line)[:240], "confidence": "candidate—review required"})
                        seen.add(key)
        if not candidates:
            warnings.append("No unambiguous district/indicator/percentage rows found. Check table layout, PDF text layer, or indicator wording.")
    # Dedupe identical values found both in extracted tables and text lines.
    unique: dict[tuple[str, str, float, int], dict[str, Any]] = {}
    for item in candidates:
        key = (item["district"], item["indicator"], item["value"], item["page"])
        unique.setdefault(key, item)
    return list(unique.values()), warnings, len(pdf.pages)


@app.post("/api/documents/preview")
async def preview_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    filename = (file.filename or "upload.pdf").lower()
    if not filename.endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Please upload a PDF file.")
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 15 MB upload limit.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file does not appear to be a valid PDF.")
    try:
        candidates, warnings, page_count = extract_candidates(data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not read this PDF. It may be damaged, encrypted, or require OCR.") from exc
    return {
        "filename": os.path.basename(filename), "page_count": page_count,
        "candidates": candidates[:500], "warnings": warnings,
        "review_required": True, "published": False,
        "message": "Preview only. Extracted values have not been written to the live dataset."
    }
