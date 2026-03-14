"""Extract calendar events from PDF and image files.
Supplements iCal import with PDF/image parsing for school annual calendars.
Uses pdfplumber for PDFs and EasyOCR for images. No GenAI required for basic extraction.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from io import BytesIO
from typing import Any

from dateutil import parser as dateutil_parser

logger = logging.getLogger(__name__)
MONTH_NAMES = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
MONTH_MAP = {m: i + 1 for i, m in enumerate(MONTH_NAMES)}


def _parse_text_for_events(text: str, base_year: int | None = None) -> list[dict[str, Any]]:
    """Parse plain text for date+event patterns. Returns list of {title, start_time, end_time, description}."""
    if base_year is None:
        base_year = datetime.now().year
    events: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    # Common patterns: "15 April", "Apr 15", "15/4/2026", "15-04-2026", "April 15, 2026", "15th April"
    date_prefix = re.compile(
        r"^[\s\-–—]*"  # leading dashes/spaces
        r"("
        r"\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?|"  # 15/4 or 15/4/26
        r"\d{1,2}[-/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[-/]\d{2,4}|"  # 15-Apr-2026
        r"\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*,?\s*\d{0,4}|"  # 15th Apr 2026
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{0,4}|"  # April 15th, 2026
        r"\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*,?\s*\d{0,4}|"  # 15 Apr 2026
        r"\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{0,4}"
        r")"
        r"[\s\-–—:]+(.*)$",
        re.IGNORECASE,
    )

    for line in text.splitlines():
        line = line.strip()
        if len(line) < 5:
            continue
        m = date_prefix.search(line)
        if not m:
            continue
        date_str = m.group(1).strip()
        rest = m.group(2).strip()
        # Skip if rest looks like another date or is too short
        if not rest or len(rest) < 2 or rest.lower() in ("holiday", "holidays", "break", "closed"):
            continue
        try:
            dt = dateutil_parser.parse(date_str, default=datetime(base_year, 1, 1))
            if dt.year < 2000 and base_year >= 2000:
                dt = dt.replace(year=base_year)
            start_iso = dt.strftime("%Y-%m-%dT09:00:00")
            # Dedupe by title+date
            key = (rest[:80], start_iso[:10])
            if key in seen:
                continue
            seen.add(key)
            events.append({
                "title": rest[:500],
                "start_time": start_iso,
                "end_time": None,
                "description": None,
            })
        except (ValueError, TypeError):
            continue
    return events


def _parse_month(s: str) -> int | None:
    """Parse month name to 1-12. Handles Jan, January, APR, 1-12."""
    if not s:
        return None
    s = str(s).strip().lower()
    if len(s) >= 3:
        m = MONTH_MAP.get(s[:3])
        if m is not None:
            return m
    # Numeric 1-12
    try:
        n = int(re.sub(r"\D", "", s))
        if 1 <= n <= 12:
            return n
    except (ValueError, TypeError):
        pass
    return None


def _is_yellowish(color: Any) -> bool:
    """Check if color tuple looks yellow (high R, high G, low B)."""
    if not color or not isinstance(color, (tuple, list)) or len(color) < 3:
        return False
    r, g, b = float(color[0]), float(color[1]), float(color[2])
    return r > 0.7 and g > 0.7 and b < 0.5


def extract_from_pdf_grid(
    content: bytes, base_year: int | None = None, yellow_only: bool = True
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Extract events from PDF calendar table: columns=months, rows=days, yellow cells=events.
    Returns (events, debug_log). Does NOT write to DB.
    """
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber is not installed") from None

    if base_year is None:
        base_year = datetime.now().year
    debug_log: list[str] = []
    events: list[dict[str, Any]] = []

    text_sample = content[:2000].decode("utf-8", errors="ignore")
    year_match = re.search(r"20\d{2}[\s\-]*['\"]?2[67]['\"]?|['\"]?2[67]['\"]?[\s\-]*20\d{2}", text_sample)
    if year_match:
        y = re.search(r"20\d{2}", year_match.group())
        if y:
            base_year = int(y.group())
    debug_log.append(f"[PDF Grid] Using base_year={base_year}")

    with pdfplumber.open(BytesIO(content)) as pdf:
        # Collect yellow rect bboxes (page coords) for overlap check
        yellow_rects_by_page: dict[int, list[dict]] = {}
        for pnum, page in enumerate(pdf.pages):
            yellow_rects_by_page[pnum] = []
            try:
                for obj in getattr(page, "rects", []) or []:
                    color = obj.get("non_stroking_color")
                    if _is_yellowish(color):
                        yellow_rects_by_page[pnum].append(obj)
            except Exception:
                pass
            # Also check curves/paths that may carry fill color
            try:
                for obj in getattr(page, "curves", []) or []:
                    color = obj.get("non_stroking_color")
                    if _is_yellowish(color):
                        yellow_rects_by_page[pnum].append(obj)
            except Exception:
                pass
            debug_log.append(f"[PDF Grid] Page {pnum + 1}: found {len(yellow_rects_by_page[pnum])} yellow regions")

        for pnum, page in enumerate(pdf.pages):
            tables = page.find_tables()
            if not tables:
                tables = []
                raw = page.extract_tables()
                if raw:
                    debug_log.append(f"[PDF Grid] Page {pnum + 1}: using extract_tables (no find_tables)")
            else:
                debug_log.append(f"[PDF Grid] Page {pnum + 1}: found {len(tables)} table(s)")

            for ti, table in enumerate(tables) if tables else []:
                try:
                    rows = table.extract(x_tolerance=5, y_tolerance=5) or []
                except Exception:
                    rows = []
                if not rows:
                    try:
                        rows = page.extract_tables()[ti] if ti < len(page.extract_tables() or []) else []
                    except Exception:
                        rows = []
                if not rows:
                    continue

                debug_log.append(f"[PDF Grid] Table {ti + 1}: {len(rows)} rows x {len(rows[0]) if rows else 0} cols")

                # Infer header row and day column: row0 = months, col0 = days
                month_cols: dict[int, int] = {}
                header_row_idx = 0
                for try_row in range(min(3, len(rows))):
                    header = [str(c or "").strip() for c in rows[try_row]] if rows else []
                    for c, h in enumerate(header):
                        m = _parse_month(h)
                        if m is not None:
                            month_cols[c] = m
                    if month_cols:
                        header_row_idx = try_row
                        break
                if not month_cols and len(rows) > 1:
                    # Maybe first col is months (rotated layout)
                    for r, row in enumerate(rows[:5]):
                        cell = str((row or [None])[0] or "").strip()
                        m = _parse_month(cell)
                        if m is not None:
                            month_cols[0] = m
                            header_row_idx = 0
                            break
                debug_log.append(f"[PDF Grid] Header row {header_row_idx}, month columns: {month_cols}")
                if not month_cols and rows:
                    debug_log.append(f"[PDF Grid] First 3 rows for inspection: {[[str(c)[:20] for c in (r or [])[:8]] for r in rows[:3]]}")

                for r, row in enumerate(rows):
                    if r <= header_row_idx:
                        continue
                    cells = list(row) if row else []
                    day_val = None
                    if cells:
                        try:
                            day_val = int(re.sub(r"\D", "", str(cells[0] or "")) or 0)
                        except (ValueError, TypeError):
                            pass
                    if day_val is None or day_val < 1 or day_val > 31:
                        continue

                    for c, cell in enumerate(cells):
                        if c == 0:
                            continue
                        text = str(cell or "").strip()
                        if not text or len(text) < 2:
                            continue
                        month = month_cols.get(c)
                        if month is None:
                            month = month_cols.get(c - 1)

                        if month is not None:
                            try:
                                dt = datetime(base_year, month, day_val)
                                start_iso = dt.strftime("%Y-%m-%dT09:00:00")
                            except ValueError:
                                continue
                            # For yellow_only: we would need to check cell bbox vs yellow rects
                            # pdfplumber Table doesn't easily give per-cell bbox, so we log all for now
                            events.append({
                                "title": text[:500],
                                "start_time": start_iso,
                                "end_time": None,
                                "description": None,
                                "_meta": {"row": r, "col": c, "day": day_val, "month": month},
                            })
                            debug_log.append(
                                f"  -> {base_year}-{month:02d}-{day_val:02d} col{c} \"{text[:60]}...\"" if len(text) > 60 else f"  -> {base_year}-{month:02d}-{day_val:02d} col{c} \"{text}\""
                            )

            # Fallback: extract_tables without find_tables
            if not tables and page.extract_tables():
                raw_tables = page.extract_tables() or []
                debug_log.append(f"[PDF Grid] Fallback: {len(raw_tables)} raw table(s) from extract_tables")
                for ti, raw_table in enumerate(raw_tables):
                    rows = raw_table or []
                    if not rows or len(rows) < 2:
                        continue
                    header = [str(c or "").strip() for c in rows[0]]
                    debug_log.append(f"[PDF Grid] Raw table {ti + 1} header: {header[:15]}{'...' if len(header) > 15 else ''}")
                    month_cols = {}
                    for c, h in enumerate(header):
                        m = _parse_month(h)
                        if m is not None:
                            month_cols[c] = m
                    for r, row in enumerate(rows[1:], 1):
                        cells = list(row) if row else []
                        try:
                            day_val = int(re.sub(r"\D", "", str(cells[0] if cells else "") or "") or 0)
                        except (ValueError, TypeError):
                            continue
                        if day_val < 1 or day_val > 31:
                            continue
                        for c, cell in enumerate(cells[1:], 1):
                            text = str(cell or "").strip()
                            if not text or len(text) < 2:
                                continue
                            month = month_cols.get(c) or month_cols.get(c - 1)
                            if month is None:
                                continue
                            try:
                                dt = datetime(base_year, month, day_val)
                                start_iso = dt.strftime("%Y-%m-%dT09:00:00")
                            except ValueError:
                                continue
                            events.append({
                                "title": text[:500],
                                "start_time": start_iso,
                                "end_time": None,
                                "description": None,
                                "_meta": {"row": r, "col": c, "day": day_val, "month": month},
                            })
                            debug_log.append(f"  -> {base_year}-{month:02d}-{day_val:02d} \"{text[:50]}\"")

    debug_log.append(f"[PDF Grid] Total extracted: {len(events)} events")
    return events, debug_log


def _get_base_year(text_sample: str) -> int:
    """Infer base year from text (e.g. 2026-27)."""
    base_year = datetime.now().year
    year_match = re.search(r"20\d{2}[\s\-]*['\"]?2[67]['\"]?|['\"]?2[67]['\"]?[\s\-]*20\d{2}", text_sample)
    if year_match:
        y = re.search(r"20\d{2}", year_match.group())
        if y:
            base_year = int(y.group())
    return base_year


def extract_from_pdf(content: bytes, debug_log: list[str] | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    """Extract events from PDF using pdfplumber text + tables. Returns (events, debug_log)."""
    log = debug_log if debug_log is not None else []
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber is not installed") from None

    base_year = _get_base_year(content[:2000].decode("utf-8", errors="ignore"))
    all_text_parts: list[str] = []
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if tables:
                for t in tables:
                    for row in t or []:
                        row_text = " ".join(str(c) if c else "" for c in row)
                        if row_text.strip():
                            all_text_parts.append(row_text)
            txt = page.extract_text()
            if txt:
                all_text_parts.append(txt)
    text = "\n".join(all_text_parts)
    log.append(f"[PDF Text] pdfplumber extracted {len(text)} chars from {len(all_text_parts)} blocks")
    if text:
        log.append(f"[PDF Text] Sample (first 300 chars): {repr(text[:300])}")
    events = _parse_text_for_events(text, base_year)
    log.append(f"[PDF Text] Parsed {len(events)} events from text patterns")
    return events, log


def extract_from_pdf_pymupdf(content: bytes, debug_log: list[str] | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    """Fallback: PyMuPDF often extracts text better from complex layouts."""
    log = debug_log if debug_log is not None else []
    try:
        import fitz  # pymupdf
    except ImportError:
        log.append("[PDF PyMuPDF] pymupdf not installed, skipping")
        return [], log

    base_year = _get_base_year(content[:2000].decode("utf-8", errors="ignore"))
    parts: list[str] = []
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            parts.append(page.get_text("text"))
        doc.close()
    except Exception as e:
        log.append(f"[PDF PyMuPDF] Error: {e}")
        return [], log
    text = "\n".join(parts)
    log.append(f"[PDF PyMuPDF] Extracted {len(text)} chars")
    if text:
        log.append(f"[PDF PyMuPDF] Sample: {repr(text[:300])}")
    events = _parse_text_for_events(text, base_year)
    log.append(f"[PDF PyMuPDF] Parsed {len(events)} events")
    return events, log


def extract_from_pdf_ocr(content: bytes, debug_log: list[str] | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    """For scanned/image-based PDFs: render pages to images and OCR with Tesseract."""
    log = debug_log if debug_log is not None else []
    try:
        import fitz
        import pytesseract
        from PIL import Image
    except ImportError as e:
        log.append(f"[PDF OCR] Missing dependency: {e}")
        return [], log

    base_year = _get_base_year(content[:2000].decode("utf-8", errors="ignore"))
    parts: list[str] = []
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        for i, page in enumerate(doc):
            mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            txt = pytesseract.image_to_string(img)
            parts.append(txt)
        doc.close()
    except Exception as e:
        log.append(f"[PDF OCR] Error (is tesseract installed?): {e}")
        return [], log
    text = "\n".join(parts)
    log.append(f"[PDF OCR] Extracted {len(text)} chars from {len(parts)} pages")
    if text.strip():
        log.append(f"[PDF OCR] Sample: {repr(text[:300])}")
    events = _parse_text_for_events(text, base_year)
    log.append(f"[PDF OCR] Parsed {len(events)} events")
    return events, log


def extract_from_image(content: bytes) -> list[dict[str, Any]]:
    """Extract events from image (PNG, JPEG) using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        raise RuntimeError(
            "pytesseract/Pillow not installed. For images, also install tesseract-ocr: apt install tesseract-ocr"
        ) from e

    img = Image.open(BytesIO(content))
    text = pytesseract.image_to_string(img)
    base_year = datetime.now().year
    return _parse_text_for_events(text, base_year)
