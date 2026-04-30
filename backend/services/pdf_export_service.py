import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def generate_pdf(title: str, content: str) -> bytes:
    """Render a titled document with body text and return raw PDF bytes."""
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

    story = [Paragraph(title, heading_style)]

    for line in content.splitlines():
        # Preserve blank lines as vertical space; escape HTML entities
        if line.strip() == "":
            story.append(Spacer(1, 4 * mm))
        else:
            safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(safe, body_style))

    doc.build(story)
    return buf.getvalue()
