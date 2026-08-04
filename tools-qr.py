#!/usr/bin/env python3
"""Generador de QR sin dependencias. Version 4, correccion M (33x33 modulos)."""
import zlib, struct, sys

URL = "https://antoniromera.github.io/operacion-cbr/"
VER, SIZE = 4, 33
TOTAL_CW, DATA_CW, EC_PER_BLOCK, BLOCKS = 100, 64, 18, 2
REMAINDER_BITS = 7

# ---------- GF(256) ----------
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
for i in range(255, 512):
    EXP[i] = EXP[i - 255]

def mul(a, b):
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]

def rs_generator(n):
    g = [1]
    for i in range(n):
        g2 = [0] * (len(g) + 1)
        for j, c in enumerate(g):
            g2[j] ^= mul(c, 1)
            g2[j + 1] ^= mul(c, EXP[i])
        g = g2
    return g

def rs_ec(data, n):
    gen = rs_generator(n)
    res = list(data) + [0] * n
    for i in range(len(data)):
        f = res[i]
        if f:
            for j, g in enumerate(gen):
                res[i + j] ^= mul(g, f)
    return res[len(data):]

# ---------- codificacion ----------
def encode(text):
    payload = text.encode("utf-8")
    bits = "0100" + format(len(payload), "08b") + "".join(format(b, "08b") for b in payload)
    cap = DATA_CW * 8
    assert len(bits) <= cap, "el texto no cabe en la version 4-M"
    bits += "0" * min(4, cap - len(bits))
    bits += "0" * (-len(bits) % 8)
    cw = [int(bits[i:i + 8], 2) for i in range(0, len(bits), 8)]
    pads = [0xEC, 0x11]
    while len(cw) < DATA_CW:
        cw.append(pads[(len(cw) - len(bits) // 8) % 2])
    per = DATA_CW // BLOCKS
    blocks = [cw[i * per:(i + 1) * per] for i in range(BLOCKS)]
    ecs = [rs_ec(b, EC_PER_BLOCK) for b in blocks]
    out = []
    for i in range(per):
        for b in blocks:
            out.append(b[i])
    for i in range(EC_PER_BLOCK):
        for e in ecs:
            out.append(e[i])
    assert len(out) == TOTAL_CW
    return "".join(format(b, "08b") for b in out) + "0" * REMAINDER_BITS

# ---------- matriz ----------
def blank():
    return [[None] * SIZE for _ in range(SIZE)], [[False] * SIZE for _ in range(SIZE)]

def place_static(m, fixed):
    def put(r, c, v):
        if 0 <= r < SIZE and 0 <= c < SIZE:
            m[r][c] = v
            fixed[r][c] = True
    for (br, bc) in [(0, 0), (0, SIZE - 7), (SIZE - 7, 0)]:
        for r in range(-1, 8):
            for c in range(-1, 8):
                dentro = 0 <= r < 7 and 0 <= c < 7
                borde = r in (0, 6) or c in (0, 6)
                nucleo = 2 <= r <= 4 and 2 <= c <= 4
                put(br + r, bc + c, 1 if (dentro and (borde or nucleo)) else 0)
    for i in range(8, SIZE - 8):                       # patrones de sincronismo
        put(6, i, 1 - i % 2)
        put(i, 6, 1 - i % 2)
    for r in range(-2, 3):                             # patron de alineacion (26,26)
        for c in range(-2, 3):
            put(26 + r, 26 + c, 1 if max(abs(r), abs(c)) != 1 else 0)
    put(SIZE - 8, 8, 1)                                # modulo oscuro obligatorio
    for i in range(9):                                 # reserva del formato
        if not fixed[8][i]: put(8, i, 0)
        if not fixed[i][8]: put(i, 8, 0)
    for i in range(8):
        put(8, SIZE - 1 - i, 0)
        put(SIZE - 1 - i, 8, 0)

def place_data(m, fixed, bits):
    i, up, col = 0, True, SIZE - 1
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(SIZE - 1, -1, -1) if up else range(SIZE)
        for r in rows:
            for c in (col, col - 1):
                if not fixed[r][c]:
                    m[r][c] = int(bits[i]) if i < len(bits) else 0
                    i += 1
        up = not up
        col -= 2

MASKS = [
    lambda r, c: (r + c) % 2 == 0,
    lambda r, c: r % 2 == 0,
    lambda r, c: c % 3 == 0,
    lambda r, c: (r + c) % 3 == 0,
    lambda r, c: (r // 2 + c // 3) % 2 == 0,
    lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
    lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
    lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0,
]

def format_bits(mask):
    val = (0b00 << 3) | mask          # 00 = correccion M
    d = val << 10
    g = 0b10100110111
    for i in range(4, -1, -1):
        if d & (1 << (i + 10)):
            d ^= g << i
    return format(((val << 10) | d) ^ 0b101010000010010, "015b")

def apply_format(m, mask):
    f = format_bits(mask)             # 15 bits, el mas significativo primero
    bit = lambda i: int(f[14 - i])    # bit i contando desde el menos significativo
    for i in range(6):                # primera copia: columna 8 hacia abajo...
        m[i][8] = bit(i)
    m[7][8] = bit(6)
    m[8][8] = bit(7)
    m[8][7] = bit(8)
    for i in range(9, 15):            # ...y fila 8 hacia la izquierda
        m[8][14 - i] = bit(i)
    for i in range(8):                # segunda copia: fila 8 desde la derecha...
        m[8][SIZE - 1 - i] = bit(i)
    for i in range(8, 15):            # ...y columna 8 desde abajo
        m[SIZE - 15 + i][8] = bit(i)

def penalty(m):
    p = 0
    for line in list(m) + [list(col) for col in zip(*m)]:      # regla 1: rachas
        run, prev = 1, line[0]
        for v in line[1:]:
            if v == prev:
                run += 1
            else:
                if run >= 5: p += 3 + run - 5
                run, prev = 1, v
        if run >= 5: p += 3 + run - 5
    for r in range(SIZE - 1):                                   # regla 2: bloques 2x2
        for c in range(SIZE - 1):
            if m[r][c] == m[r][c + 1] == m[r + 1][c] == m[r + 1][c + 1]:
                p += 3
    pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
    pat2 = pat1[::-1]
    for line in list(m) + [list(col) for col in zip(*m)]:       # regla 3: falsos finders
        for i in range(SIZE - 10):
            if line[i:i + 11] == pat1 or line[i:i + 11] == pat2:
                p += 40
    dark = sum(sum(r) for r in m)                               # regla 4: proporcion
    p += 10 * (abs(dark * 100 // (SIZE * SIZE) - 50) // 5)
    return p

def build(text):
    bits = encode(text)
    mejor, mejor_p = None, None
    for mask in range(8):
        m, fixed = blank()
        place_static(m, fixed)
        place_data(m, fixed, bits)
        for r in range(SIZE):
            for c in range(SIZE):
                if not fixed[r][c] and MASKS[mask](r, c):
                    m[r][c] ^= 1
        apply_format(m, mask)
        p = penalty(m)
        if mejor_p is None or p < mejor_p:
            mejor, mejor_p = m, p
    return mejor

# ---------- salidas ----------
def png(m, path, escala=12, quiet=4):
    lado = (SIZE + quiet * 2) * escala
    filas = bytearray()
    for y in range(lado):
        filas.append(0)
        my = y // escala - quiet
        fila = bytearray()
        for x in range(lado):
            mx = x // escala - quiet
            oscuro = 0 <= my < SIZE and 0 <= mx < SIZE and m[my][mx]
            fila += b"\x00\x00\x00" if oscuro else b"\xff\xff\xff"
        filas += fila
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    blob = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", lado, lado, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(filas), 9))
            + chunk(b"IEND", b""))
    open(path, "wb").write(blob)
    return path, lado

def texto(m, quiet=2):
    """Medios bloques: dos filas de modulos por linea de terminal."""
    grid = [[0] * (SIZE + quiet * 2) for _ in range(quiet)] \
         + [[0] * quiet + f + [0] * quiet for f in m] \
         + [[0] * (SIZE + quiet * 2) for _ in range(quiet)]
    if len(grid) % 2:
        grid.append([0] * len(grid[0]))
    out = []
    for y in range(0, len(grid), 2):
        linea = ""
        for x in range(len(grid[0])):
            arriba, abajo = grid[y][x], grid[y + 1][x]
            linea += ("█" if arriba and abajo else "▀" if arriba else "▄" if abajo else " ")
        out.append(linea)
    return "\n".join(out)

if __name__ == "__main__":
    m = build(URL)
    ruta, lado = png(m, sys.argv[1] if len(sys.argv) > 1 else "/tmp/qr.png")
    print(f"PNG: {ruta} ({lado}x{lado})", file=sys.stderr)
    print(texto(m))
