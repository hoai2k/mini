"""Compose the stand-in title background (ui/title-bg.webp) from game sprites.

The delivered OM-U02 picture shows all seven monsters, which spoils the story's
surprises, so until its replacement arrives the title shows only the three
monsters from the book's cover, the Trollusk, the Bombanat and the Yalapappus,
chasing the letter across the Bombanat's wooded coast.

    python3 onemonster/tools/compose_title.py
"""
from pathlib import Path
from PIL import Image, ImageFilter

GAME = Path(__file__).resolve().parent.parent / "game"
SP = GAME / "sprites"
W, H = 1920, 1080


def sprite(path, height, flip=False, rot=0):
    im = Image.open(SP / path).convert("RGBA")
    box = im.getbbox()
    im = im.crop(box)
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if rot:
        im = im.rotate(rot, Image.BICUBIC, expand=True)
    return im


def place(bg, im, cx, foot, shadow=True):
    """Paste with its feet at (cx, foot), over a soft ground shadow."""
    x, y = round(cx - im.width / 2), round(foot - im.height)
    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        s = Image.new("RGBA", (round(im.width * 0.7), 40), (40, 30, 20, 90))
        mask = Image.new("L", s.size, 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).ellipse((0, 0, s.width - 1, s.height - 1), fill=255)
        sh.paste(s, (round(cx - s.width / 2), round(foot - 22)), mask)
        bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    bg.alpha_composite(im, (x, y))


def build(write=True):
    bg = Image.open(SP / "scenes/bombanat.webp").convert("RGBA").resize((W, H), Image.LANCZOS)
    # Left to right: the Yalapappus trundling and the Bombanat swooping after the
    # Trollusk, who runs off with the letter in his teeth.
    place(bg, sprite("yalapappus/poses/02.webp", 400), 330, 1010)
    place(bg, sprite("trollusk/poses/06.webp", 340), 1300, 990)
    bat = sprite("bombanat/poses/15.webp", 300)
    place(bg, bat, 820, 740, shadow=False)
    if write:
        bg.convert("RGB").save(SP / "ui/title-bg.webp", quality=88, method=6)
    return SP / "ui/title-bg.webp", W, H


if __name__ == "__main__":
    print("wrote", build()[0])
