import io
from typing import Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def _xml_escape(text: str) -> str:
    """Escape characters that would break reportlab's XML Paragraph parser."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _apply_links(line: str, link_map: List[Dict]) -> str:
    """Return an XML-safe line with anchor_text occurrences replaced by
    inline reportlab hyperlink tags.

    Strategy:
    - Sort links by anchor_text length (longest first) to prevent a short
      anchor from consuming part of a longer one.
    - Find all non-overlapping occurrences in a single left-to-right pass.
    - Escape plain text segments; leave link tags unescaped so reportlab
      interprets them as markup.
    """
    candidates = [
        lk for lk in link_map
        if lk.get("anchor_text") and lk.get("url") and lk["anchor_text"] in line
    ]

    if not candidates:
        return _xml_escape(line)

    # Sort longest anchor first to avoid partial-match shadowing
    candidates.sort(key=lambda x: len(x["anchor_text"]), reverse=True)

    # Collect non-overlapping (start, end, tag) spans
    spans: List = []
    for lk in candidates:
        anchor = lk["anchor_text"]
        url = lk["url"]
        idx = line.find(anchor)
        if idx == -1:
            continue
        end = idx + len(anchor)
        # Skip if this span overlaps any already-claimed region
        if any(s < end and e > idx for s, e, _ in spans):
            continue
        safe_url = _xml_escape(url)
        safe_anchor = _xml_escape(anchor)
        tag = f'<a href="{safe_url}" color="blue"><u>{safe_anchor}</u></a>'
        spans.append((idx, end, tag))

    if not spans:
        return _xml_escape(line)

    spans.sort()  # left to right
    parts: List[str] = []
    prev = 0
    for start, end, tag in spans:
        parts.append(_xml_escape(line[prev:start]))
        parts.append(tag)
        prev = end
    parts.append(_xml_escape(line[prev:]))
    return "".join(parts)


def generate_pdf(
    title: str,
    content: str,
    links: Optional[List[Dict]] = None,
) -> bytes:
    """Render a titled document with hyperlinks embedded inline.

    Args:
        title:   Document heading.
        content: Plain-text body; blank lines become vertical spacers.
        links:   List of {"anchor_text": str, "url": str} dicts.
                 Wherever anchor_text appears in a content line it is
                 replaced with a clickable blue underlined hyperlink.
                 Links without anchor_text are silently ignored.

    Returns:
        Raw PDF bytes.
    """
    link_map: List[Dict] = links or []

    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    base = getSampleStyleSheet()

    heading_style = ParagraphStyle(
        "Heading",
        parent=base["Heading1"],
        fontSize=18,
        leading=24,
        spaceAfter=8 * mm,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=base["Normal"],
        fontSize=10,
        leading=15,
        spaceAfter=4,
    )

    story = [Paragraph(_xml_escape(title), heading_style)]

    for line in content.splitlines():
        if line.strip() == "":
            story.append(Spacer(1, 4 * mm))
        else:
            safe = _apply_links(line, link_map)
            story.append(Paragraph(safe, body_style))

    doc.build(story)
    return buf.getvalue()
