"""
Loophire placeholder icon generator.
Produces a consistent orange-square-with-L logo matching the navbar badge.
Replace with a real design via https://realfavicongenerator.net when ready.
"""

from PIL import Image, ImageDraw, ImageFont
import os

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_COLOR   = (249, 115, 22)   # #f97316 — matches --color-accent in index.css
TEXT_COLOR = (255, 255, 255)

FONT_PATHS = [
    "/System/Library/Fonts/Helvetica.ttc",          # macOS
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
]

def load_font(size):
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

def make_square_icon(size):
    img  = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)
    font = load_font(max(int(size * 0.52), 8))
    draw.text((size / 2, size / 2), "L", fill=TEXT_COLOR, font=font, anchor="mm")
    return img

def make_og_image():
    W, H = 1200, 630
    img  = Image.new("RGB", (W, H), (13, 15, 20))   # --color-bg
    draw = ImageDraw.Draw(img)

    # accent bar left edge
    draw.rectangle([0, 0, 8, H], fill=BG_COLOR)

    # logo badge
    badge_size = 120
    badge_x, badge_y = 100, H // 2 - badge_size // 2
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_size, badge_y + badge_size],
        radius=24, fill=BG_COLOR
    )
    font_badge = load_font(68)
    draw.text(
        (badge_x + badge_size / 2, badge_y + badge_size / 2),
        "L", fill=TEXT_COLOR, font=font_badge, anchor="mm"
    )

    # wordmark
    font_large = load_font(96)
    font_small = load_font(36)
    draw.text((badge_x + badge_size + 36, H // 2 - 56), "Loophire",
              fill=(228, 231, 240), font=font_large, anchor="lm")
    draw.text((badge_x + badge_size + 40, H // 2 + 52),
              "AI-powered job application agent",
              fill=(124, 131, 158), font=font_small, anchor="lm")

    return img

# ── output spec ────────────────────────────────────────────────────────────────

OUTPUTS = [
    # (relative_path,                     size_or_None, is_og, is_ico)
    ("frontend/public/favicon-16x16.png",        16,   False, False),
    ("frontend/public/favicon-32x32.png",        32,   False, False),
    ("frontend/public/apple-touch-icon.png",    180,   False, False),
    ("frontend/public/android-chrome-192x192.png", 192, False, False),
    ("frontend/public/android-chrome-512x512.png", 512, False, False),
    ("frontend/public/favicon.ico",              32,   False, True),
    ("frontend/public/og-image.png",             None, True,  False),
    ("extension/icons/icon16.png",               16,   False, False),
    ("extension/icons/icon32.png",               32,   False, False),
    ("extension/icons/icon48.png",               48,   False, False),
    ("extension/icons/icon128.png",             128,   False, False),
]

for rel_path, size, is_og, is_ico in OUTPUTS:
    abs_path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    if is_og:
        img = make_og_image()
        img.save(abs_path, format="PNG")
        print(f"  created  {rel_path}  (1200x630)")
    elif is_ico:
        img = make_square_icon(size).convert("RGB")
        img.save(abs_path, format="ICO", sizes=[(32, 32)])
        print(f"  created  {rel_path}  ({size}x{size})")
    else:
        img = make_square_icon(size).convert("RGB")
        img.save(abs_path, format="PNG")
        print(f"  created  {rel_path}  ({size}x{size})")

print("\nAll icons generated.")
print("Replace with real designs via https://realfavicongenerator.net when ready.")
