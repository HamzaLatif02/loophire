import re
import unicodedata
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
    # Normalise any remaining unicode to closest ASCII equivalent where possible
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", errors="ignore").decode("ascii")
    return text


def _clean_whitespace(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = re.sub(r"[ \t]+", " ", line).strip()
        lines.append(line)

    # Collapse runs of more than two consecutive blank lines into two
    cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
    return cleaned.strip()


def parse_pdf(file_bytes: bytes) -> str:
    """Extract and clean text from a PDF given its raw bytes."""
    import io

    pages_text: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=2, y_tolerance=2)
            if page_text:
                pages_text.append(page_text)

    if not pages_text:
        raise ValueError("No extractable text found in the PDF.")

    raw = "\n\n".join(pages_text)
    fixed = _fix_encoding(raw)
    cleaned = _clean_whitespace(fixed)
    return cleaned
