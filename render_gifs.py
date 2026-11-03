"""Render README showcase GIFs from the mod's own frame data.

usage: python render_gifs.py <repo folder>
Writes <repo>/assets/hero.gif, <repo>/assets/pets/<Word>.gif and the
plugin icon <repo>/.claude-plugin/icon.png
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

REPO = sys.argv[1]
HOOKS = os.path.join(REPO, 'hooks')
OUT = os.path.join(REPO, 'assets')

index = open(os.path.join(HOOKS, 'stickers.ts')).read()
W = int(re.search(r'WIDTH = (\d+)', index)[1])
H = int(re.search(r'HEIGHT = (\d+)', index)[1])
KEYS = re.search(r"KEYS = '(.*)'", index)[1]
STICKERS = {}
for n in (1, 2, 3):
    src = open(os.path.join(HOOKS, f'stickers-{n}.ts')).read()
    STICKERS.update(json.loads(src.split('= ', 1)[1]))

MENLO = '/System/Library/Fonts/Menlo.ttc'
BG = (24, 24, 27)
PANEL = (32, 32, 36)
BAR = (44, 44, 50)
BORDER = (82, 82, 90)
TEXT = (228, 228, 231)
DIM = (140, 140, 150)
ORANGE = (217, 119, 87)
SPIN = '·✢✳✶✻✽✻✶✳✢'


def font(size, bold=False):
    return ImageFont.truetype(MENLO, size, index=1 if bold else 0)


def color(value):
    return ((value >> 16) & 255, (value >> 8) & 255, value & 255)


def draw_pet(draw, sticker, frame, x0, y0, px):
    pixels = sticker['f'][frame % len(sticker['f'])]
    for i, ch in enumerate(pixels):
        k = KEYS.index(ch)
        if k <= 0:
            continue
        r, c = divmod(i, W)
        x, y = x0 + c * px, y0 + r * px
        draw.rectangle([x, y, x + px - 1, y + px - 1], fill=color(sticker['p'][k - 1]))


def centered(draw, text, cx, y, fnt, fill):
    w = draw.textlength(text, font=fnt)
    draw.text((cx - w / 2, y), text, font=fnt, fill=fill)


def save(frames, path, duration):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pal = [f.convert('P', palette=Image.ADAPTIVE, colors=64) for f in frames]
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=duration, loop=0,
                optimize=True, disposal=1)
    print(path, os.path.getsize(path) // 1024, 'KB', len(frames), 'frames')


def pet_tile(word, px=8):
    sticker = STICKERS[word]
    tw, th = W * px + 48, H * px + 64
    label = font(18, bold=True)
    frames = []
    for f in range(len(sticker['f'])):
        im = Image.new('RGB', (tw, th), BG)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, tw - 1, th - 1], radius=14, fill=PANEL, outline=BAR)
        draw_pet(d, sticker, f, 24, 16, px)
        centered(d, f'{word} ...', tw / 2, H * px + 26, label, ORANGE)
        frames.append(im)
    save(frames, os.path.join(OUT, 'pets', f'{word}.gif'), sticker['d'])


def hero(words, seconds_each=1.6):
    px = 7
    width, height = 760, 470
    mono, bold, small = font(16), font(16, bold=True), font(14)
    frames = []
    for word in words:
        sticker = STICKERS[word]
        n = max(1, round(seconds_each * 1000 / sticker['d']))
        for f in range(n):
            im = Image.new('RGB', (width, height), BG)
            d = ImageDraw.Draw(im)
            # window
            d.rounded_rectangle([0, 0, width - 1, height - 1], radius=12, fill=PANEL, outline=BAR)
            d.rounded_rectangle([0, 0, width - 1, 34], radius=12, fill=BAR)
            d.rectangle([0, 22, width - 1, 34], fill=BAR)
            for i, dot in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
                d.ellipse([16 + i * 20, 11, 28 + i * 20, 23], fill=dot)
            centered(d, 'claude', width / 2, 9, small, DIM)
            # transcript
            d.text((24, 52), '> add a dark mode toggle to the settings page', font=mono, fill=DIM)
            d.text((24, 84), SPIN[f % len(SPIN)], font=bold, fill=ORANGE)
            d.text((46, 84), f'{word}…', font=bold, fill=ORANGE)
            secs = 3 + words.index(word) * 2 + f * sticker['d'] // 1000
            d.text((46 + d.textlength(f'{word}… ', font=bold), 84),
                   f'({secs}s · esc to interrupt)', font=mono, fill=DIM)
            # band above the prompt: the pet and its word
            pet_x = 40
            pet_y = 128
            draw_pet(d, sticker, f, pet_x, pet_y, px)
            centered(d, f'{word} ...', pet_x + W * px / 2, pet_y + H * px + 8, bold, ORANGE)
            # prompt box
            top = height - 84
            d.rounded_rectangle([16, top, width - 17, top + 46], radius=8, outline=BORDER, width=2)
            d.text((32, top + 13), '>', font=bold, fill=TEXT)
            if (f // 5) % 2 == 0:
                d.rectangle([52, top + 13, 61, top + 33], fill=TEXT)
            d.text((24, height - 30), '? for shortcuts', font=small, fill=DIM)
            frames.append(im)
    save(frames, os.path.join(OUT, 'hero.gif'), STICKERS[words[0]]['d'])


def icon(word='Sock-hopping', frame=0, size=1024, fill=0.72):
    """The listing icon: one pose, cropped to its pixels, centered on the dark tile."""
    sticker = STICKERS[word]
    pixels = sticker['f'][frame]
    lit = [divmod(i, W) for i, ch in enumerate(pixels) if KEYS.index(ch) > 0]
    r0, r1 = min(r for r, _ in lit), max(r for r, _ in lit)
    c0, c1 = min(c for _, c in lit), max(c for _, c in lit)
    cols, rows = c1 - c0 + 1, r1 - r0 + 1
    px = int(size * fill / max(cols, rows))
    x0 = (size - cols * px) // 2 - c0 * px
    y0 = (size - rows * px) // 2 - r0 * px
    im = Image.new('RGB', (size, size), BG)
    draw_pet(ImageDraw.Draw(im), sticker, frame, x0, y0, px)
    path = os.path.join(REPO, '.claude-plugin', 'icon.png')
    im.save(path, optimize=True)
    print(path, im.size, os.path.getsize(path) // 1024, 'KB')


icon()
hero(['Baking', 'Jitterbugging', 'Whirlpooling', 'Sock-hopping'])
for w in ['Beboppin', 'Boogieing', 'Julienning', 'Kneading', 'Moonwalking', 'Noodling',
          'Pondering', 'Spinning', 'Whisking']:
    pet_tile(w)
