"""Okaeri v2 — derive in-game images from the key-visual reference sheets.

The sheets in picture/keyvisual/ are design sheets, not game sprites. This script
cuts the usable regions out of them without scaling (1:1 pixels) and saves them
under prototype/okaeri_v2/assets/. The original sheets are only read, never changed.

    python3 -m pip install pillow
    python3 prototype/okaeri_v2/assets/crop_keyvisual.py   # run from the repo root

Boxes are (left, top, right, bottom) in source pixels. The big character
illustrations bleed into the sheet's parchment text box on their right side, so
their crops stop at that box's border (Toto loses the tip of the hat brim, the
Demon King most of his right horn). These are temporary assets, not final sprites.

Full-body art (picture/fullbody/) is drawn on a flat black matte (RGB, no alpha;
the background is 0-3 in every channel). make_fullbody() turns the black that is
connected to the image border into transparency (flood fill, then a slight soft
edge), keeping the full canvas so normalized hit-region coordinates match the source.
Dark areas inside the figure are not connected to the border and stay opaque.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'picture' / 'keyvisual'
OUT = Path(__file__).resolve().parent

SHEETS = {
    'castle': '魔王城キーデザイン画集.png',
    'toto': 'トト 魔王城の交渉係見習い設定画.png',
    'king': '眠たげな魔王 キャラクター設定画.png',
    'leon': '勇者レオン キャラクター設定画集.png',
}

def cell(x, y, w, h, inset=4):
    """An expression cell, trimmed a little so no parchment or rounded corner shows."""
    return (x + inset, y + inset, x + w - inset, y + h - inset)

CROPS = [
    # The Demon King's audience chamber (main panel, above its caption label)
    ('castle', (10, 104, 1266, 576), 'bg/throne_room.jpg'),
    # Large character illustrations (left side of each sheet)
    ('toto', (0, 130, 350, 702), 'chara/toto_figure.jpg'),
    ('king', (0, 128, 344, 728), 'chara/king_figure.jpg'),
    # Expression cells (表情バリエーション)
    ('toto', cell(449, 392, 164, 143), 'face/toto_basic.jpg'),       # 基本（穏やか）
    ('toto', cell(623, 392, 164, 143), 'face/toto_surprised.jpg'),   # 驚き
    ('toto', cell(971, 392, 164, 143), 'face/toto_troubled.jpg'),    # 困り顔
    ('toto', cell(971, 579, 164, 143), 'face/toto_determined.jpg'),  # がんばる！
    ('king', cell(447, 414, 141, 134), 'face/king_sleepy.jpg'),      # 基本（眠そう）
    ('king', cell(1050, 414, 141, 134), 'face/king_displeased.jpg'), # 不満
    # --- gameplay / endings ---
    # Castle seen from afar (魔王城・外観), above its caption label. Small source panel.
    ('castle', (12, 668, 464, 872), 'bg/castle_exterior.jpg'),
    # Leon, adult hero (large illustration). Stops at the text box border, so the
    # right edge of his cape/shoulder is trimmed; face, hair, brooch and armor are whole.
    ('leon', (0, 124, 343, 722), 'chara/leon_figure.jpg'),
    ('leon', cell(423, 393, 138, 132), 'face/leon_calm.jpg'),        # 基本（冷静）
    ('leon', cell(573, 393, 140, 132), 'face/leon_surprised.jpg'),   # 驚き
    ('leon', cell(879, 393, 142, 132), 'face/leon_troubled.jpg'),    # 困惑
    ('leon', cell(1033, 393, 145, 132), 'face/leon_angry.jpg'),      # 怒り
    ('leon', cell(1190, 393, 143, 132), 'face/leon_determined.jpg'), # 決意
    ('leon', cell(573, 564, 140, 133), 'face/leon_relieved.jpg'),    # 安堵
    ('leon', cell(725, 564, 142, 133), 'face/leon_smile.jpg'),       # 微笑
    ('leon', cell(879, 564, 143, 133), 'face/leon_weary.jpg'),       # 疲れ
    ('leon', cell(1034, 564, 145, 133), 'face/leon_faraway.jpg'),    # 遠くを見る
    ('toto', cell(1145, 392, 164, 143), 'face/toto_smile.jpg'),      # にこっ
    ('king', cell(596, 585, 141, 128), 'face/king_content.jpg'),     # 満足
    ('king', cell(747, 585, 141, 128), 'face/king_troubled.jpg'),    # 困る
    ('king', cell(1203, 585, 141, 128), 'face/king_asleep.jpg'),     # すやすや
]

FULLBODY = ROOT / 'picture' / 'fullbody'
FULLBODIES = [
    # Leon, full body (observation screen). 1024x1536, same size as the source.
    ('赤い外套の騎士レオン.png', 'chara/leon_full.webp'),
]

def make_fullbody(src, dst, thresh=12):
    im = Image.open(src).convert('RGB')
    r, g, b = im.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mark = mx.point(lambda v: 100 if v <= thresh else 200)  # 100 = near-black
    w, h = im.size
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(mark, xy, 0, thresh=0)            # 0 = black touching the border
    alpha = mark.point(lambda v: 0 if v == 0 else 255).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, quality=88, method=6)

def main():
    sheets = {k: Image.open(SRC / v).convert('RGB') for k, v in SHEETS.items()}
    for sheet, box, name in CROPS:
        dst = OUT / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        sheets[sheet].crop(box).save(dst, quality=90, subsampling=0, optimize=True, progressive=True)
        print(f'{name:28s} {box[2] - box[0]}x{box[3] - box[1]}  {dst.stat().st_size // 1024} KB')
    for src, name in FULLBODIES:
        dst = OUT / name
        make_fullbody(FULLBODY / src, dst)
        print(f'{name:28s} {Image.open(dst).size}  {dst.stat().st_size // 1024} KB')

if __name__ == '__main__':
    main()
