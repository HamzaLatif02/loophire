import io
import re
import unicodedata
from typing import Dict, List, Optional

import pdfplumber


# Characters that commonly get mangled in PDF extraction
_ENCODING_REPLACEMENTS = {
    "‘": "'",  # left single quotation mark
    "’": "'",  # right single quotation mark
    "“": '"',  # left double quotation mark
    "”": '"',  # right double quotation mark
    "–": "-",  # en dash
    "—": "-",  # em dash
    "•": "-",  # bullet
    " ": " ",  # non-breaking space
    "ﬁ": "fi", # fi ligature
    "ﬂ": "fl", # fl ligature
}


def _fix_encoding(text: str) -> str:
    for char, replacement in _ENCODING_REPLACEMENTS.items():
        text = text.replace(char, replacement)
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", errors="ignore").decode("ascii")
    return text


def _clean_whitespace(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = re.sub(r"[ \t]+", " ", line).strip()
        lines.append(line)
    cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
    return cleaned.strip()


def _extract_uri(annot: dict) -> Optional[str]:
    """Return the URI from a pdfplumber annotation dict, or None.

    Handles both pdfplumber's flat 'uri' key and the nested
    data.A.URI structure from the raw PDF spec.
    """
    uri = annot.get("uri")
    if uri:
        return uri.decode("utf-8", errors="replace") if isinstance(uri, bytes) else str(uri)

    data = annot.get("data") or {}
    action = data.get("A") if isinstance(data, dict) else None
    if isinstance(action, dict):
        uri = action.get("URI")
        if uri:
            return uri.decode("utf-8", errors="replace") if isinstance(uri, bytes) else str(uri)

    return None


def _extract_bbox(annot: dict):
    """Return (x0, y0, x1, y1) from an annotation, or None if unavailable."""
    x0 = annot.get("x0")
    y0 = annot.get("y0")
    x1 = annot.get("x1")
    y1 = annot.get("y1")
    if all(v is not None for v in (x0, y0, x1, y1)):
        return (x0, y0, x1, y1)

    # Fallback: raw PDF Rect array [llx, lly, urx, ury] in PDF space.
    # pdfplumber exposes this under data.Rect; it converts to screen coords
    # automatically when you pass a bbox to page.crop().
    rect = (annot.get("data") or {}).get("Rect")
    if rect and len(rect) == 4:
        return tuple(rect)

    return None


def parse_pdf(file_bytes: bytes) -> str:
    """Extract and clean text from a PDF given its raw bytes (text only)."""
    return parse_pdf_with_links(file_bytes)["text"]


def parse_pdf_with_links(file_bytes: bytes) -> Dict:
    """Extract cleaned text and hyperlinks (with anchor text) from a PDF.

    Each link dict has:
        anchor_text: str  — the visible text the hyperlink was applied to
        url:         str  — the target URI

    Links without a bounding box, or where the crop yields no text, are
    still recorded but without an anchor_text key, so the PDF renderer can
    fall back gracefully.

    Returns:
        {"text": str, "links": [{"anchor_text": str, "url": str}, ...]}
    """
    pages_text: List[str] = []
    seen_urls: set = set()
    links: List[Dict] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=2, y_tolerance=2)
            if page_text:
                pages_text.append(page_text)

            for annot in (page.annots or []):
                try:
                    a = annot if isinstance(annot, dict) else vars(annot)
                    uri = _extract_uri(a)
                    if not uri or uri in seen_urls:
                        continue

                    anchor_text: Optional[str] = None
                    bbox = _extract_bbox(a)
                    if bbox:
                        try:
                            cropped = page.crop(bbox)
                            raw_anchor = cropped.extract_text()
                            if raw_anchor and raw_anchor.strip():
                                anchor_text = raw_anchor.strip()
                        except Exception:
                            pass

                    seen_urls.add(uri)
                    entry: Dict = {"url": uri}
                    if anchor_text:
                        entry["anchor_text"] = anchor_text
                    links.append(entry)
                except Exception:
                    continue

    if not pages_text:
        raise ValueError("No extractable text found in the PDF.")

    raw = "\n\n".join(pages_text)
    fixed = _fix_encoding(raw)
    cleaned = _clean_whitespace(fixed)
    return {"text": cleaned, "links": links}
