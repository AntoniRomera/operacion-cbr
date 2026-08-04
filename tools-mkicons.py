#!/usr/bin/env python3
"""Genera los iconos PNG de la PWA sin dependencias: barra olimpica sobre fondo oscuro."""
import zlib, struct, os

OUT = "/Users/aromera/Documents/personal/gym/icons"

GROUND = (0x14, 0x18, 0x1D)
STEEL  = (0xA9, 0xB6, 0xC2)
RED    = (0xC8, 0x34, 0x2E)
BLUE   = (0x2B, 0x5F, 0xA8)

# rects normalizados (0..1) respecto al centro del lienzo: (x0,y0,x1,y1,color)
def barbell(scale=1.0):
    r = []
    c = 0.5
    def sx(v):  # escala respecto al centro
        return c + (v - c) * scale
    # eje
    r.append((sx(0.075), sx(0.468), sx(0.925), sx(0.532), STEEL))
    for sign in (-1, 1):
        # disco exterior (azul, mas fino)
        x = c + sign * 0.355
        r.append((sx(x - 0.035), sx(0.34), sx(x + 0.035), sx(0.66), BLUE))
        # disco interior (rojo, mas grande)
        x = c + sign * 0.265
        r.append((sx(x - 0.045), sx(0.245), sx(x + 0.045), sx(0.755), RED))
        # collarin
        x = c + sign * 0.185
        r.append((sx(x - 0.022), sx(0.415), sx(x + 0.022), sx(0.585), STEEL))
    return r


def render(size, scale=1.0):
    rects = [(x0 * size, y0 * size, x1 * size, y1 * size, col)
             for (x0, y0, x1, y1, col) in barbell(scale)]
    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filter none
        row = bytearray()
        for x in range(size):
            col = GROUND
            px, py = x + 0.5, y + 0.5
            for (x0, y0, x1, y1, c) in rects:
                if x0 <= px <= x1 and y0 <= py <= y1:
                    col = c
            row += bytes(col)
        rows += row
    return bytes(rows)


def png(path, size, scale=1.0):
    raw = render(size, scale)
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    blob = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(blob)
    print(path, size, len(blob), "bytes")


os.makedirs(OUT, exist_ok=True)
png(f"{OUT}/icon-192.png", 192)
png(f"{OUT}/icon-512.png", 512)
png(f"{OUT}/apple-touch-icon.png", 180)
png(f"{OUT}/icon-maskable-512.png", 512, scale=0.62)  # zona segura de Android
png(f"{OUT}/favicon-32.png", 32)
