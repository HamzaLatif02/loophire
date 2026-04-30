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
    """Pull a URI string out of a pdfplumber annotation dict.

    pdfplumber versions differ in how they surface link targets:
    - Some expose a flat 'uri' key directly on the annotation dict.
    - Others nest it under annot['data']['A']['URI'] per the PDF spec.
    Both byte strings and plain strings are handled.
    """
    # Flat key (pdfplumber >= 0.10 normalised form)
    uri = annot.get("uri")
    if uri:
        return uri.decode("utf-8", errors="replace") if isinstance(uri, bytes) else str(uri)

    # Nested PDF structure: /Action dict → /URI
    data = annot.get("data") or {}
    action = data.get("A") if isinstance(data, dict) else None
    if isinstance(action, dict):
        uri = action.get("URI")
        if uri:
            return uri.decode("utf-8", errors="replace") if isinstance(uri, bytes) else str(uri)

    return None


def parse_pdf(file_bytes: bytes) -> str:
    """Extract and clean text from a PDF given its raw bytes (text only)."""
    return parse_pdf_with_links(file_bytes)["text"]


def parse_pdf_with_links(file_bytes: bytes) -> Dict:
    """Extract cleaned text and hyperlinks from a PDF.

    Returns:
        {
            "text":  str  — cleaned body text,
            "links": list — [{"url": str, "page": int}, ...] deduplicated
        }
    """
    pages_text: List[str] = []
    seen_urls: set = set()
    links: List[Dict] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=2, y_tolerance=2)
            if page_text:
                pages_text.append(page_text)

            # Extract hyperlinks from page annotations
            annots = page.annots or []
            for annot in annots:
                try:
                    uri = _extract_uri(annot if isinstance(annot, dict) else vars(annot))
                except Exception:
                    continue
                if uri and uri not in seen_urls:
                    seen_urls.add(uri)
                    links.append({"url": uri, "page": page.page_number})

    if not pages_text:
        raise ValueError("No extractable text found in the PDF.")

    raw = "\n\n".join(pages_text)
    fixed = _fix_encoding(raw)
    cleaned = _clean_whitespace(fixed)
    return {"text": cleaned, "links": links}
