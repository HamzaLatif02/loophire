import io
from typing import Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer


def generate_pdf(
    title: str,
    content: str,
    links: Optional[List[Dict]] = None,
) -> bytes:
    """Render a titled document with body text and an optional Links section.

    Args:
        title:   Document heading.
        content: Plain-text body; blank lines become vertical spacers.
        links:   List of {"url": str, "page": int} dicts from cv_parser.
                 When provided, a "Links" section is appended after the body.

    Returns:
        Raw PDF bytes.
    """
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

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=base["Heading2"],
        fontSize=12,
        leading=16,
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=base["Normal"],
        fontSize=10,
        leading=15,
        spaceAfter=4,
    )

    link_style = ParagraphStyle(
        "Link",
        parent=base["Normal"],
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#4F7FFF"),
        spaceAfter=3,
    )

    # ── title ──────────────────────────────────────────────────────────────────
    story = [Paragraph(title, heading_style)]

    # ── body ───────────────────────────────────────────────────────────────────
    for line in content.splitlines():
        if line.strip() == "":
            story.append(Spacer(1, 4 * mm))
        else:
            safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(safe, body_style))

    # ── links section ──────────────────────────────────────────────────────────
    if links:
        story.append(Spacer(1, 6 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC")))
        story.append(Paragraph("Links", section_heading_style))

        for item in links:
            url = item.get("url", "")
            page = item.get("page")
            if not url:
                continue
            safe_url = url.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            label = f'<a href="{safe_url}" color="#4F7FFF"><u>{safe_url}</u></a>'
            if page is not None:
                label += f'<font color="#888888" size="8">  (p.{page})</font>'
            story.append(Paragraph(label, link_style))

    doc.build(story)
    return buf.getvalue()
