#!/usr/bin/env python3
"""
Iconos de la PWA, sin dependencias.

Se dibuja con funciones de distancia (SDF), no con píxeles sueltos:
así los bordes salen suaves y el brillo azul del Sistema se calcula
como una caída exponencial alrededor de cada figura.

Motivo: una ventana del Sistema — cuatro esquinas marcadas — con la
barra olímpica dentro. Es el mismo lenguaje visual que la app.
"""
import math, os, struct, zlib

SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")

FONDO   = (0x08, 0x0B, 0x11)
CIAN    = (0x38, 0xBD, 0xF8)
VIOLETA = (0xA7, 0x8B, 0xFA)
ACERO   = (0xD5, 0xE2, 0xF2)

MUESTRAS = 3          # supermuestreo por eje


# ---------- funciones de distancia, en coordenadas 0..1 ----------
def sdf_rect(p, centro, medio, radio):
    """Rectángulo redondeado: negativo dentro, positivo fuera."""
    dx = abs(p[0] - centro[0]) - (medio[0] - radio)
    dy = abs(p[1] - centro[1]) - (medio[1] - radio)
    fuera = math.hypot(max(dx, 0.0), max(dy, 0.0))
    dentro = min(max(dx, dy), 0.0)
    return fuera + dentro - radio


def figuras(escala):
    """Lista de (sdf, color, brillo). Escala < 1 encoge hacia el centro."""
    def e(v):
        return 0.5 + (v - 0.5) * escala

    def largo(v):
        return v * escala

    def barra(cx, cy, mx, my, radio, color, brillo):
        """Añade un rectángulo redondeado ya escalado."""
        centro, medio, r = (e(cx), e(cy)), (largo(mx), largo(my)), largo(radio)
        fs.append((lambda p: sdf_rect(p, centro, medio, r), color, brillo))

    fs = []

    # --- cuatro esquinas de la ventana ---
    # marco holgado: iOS redondea las esquinas del icono y se comería los corchetes
    marco, grosor, brazo = 0.215, 0.038, 0.185
    for sx in (-1, 1):
        for sy in (-1, 1):
            x = 0.5 + sx * (0.5 - marco)
            y = 0.5 + sy * (0.5 - marco)
            # los brazos salen de la esquina hacia el centro, de ahí el signo
            desplaza = brazo / 2 - grosor / 2
            barra(x - sx * desplaza, y, brazo / 2, grosor / 2, 0.012, CIAN, 1.0)
            barra(x, y - sy * desplaza, grosor / 2, brazo / 2, 0.012, CIAN, 1.0)

    # --- barra olímpica dentro de la ventana ---
    barra(0.5, 0.5, 0.262, 0.024, 0.012, ACERO, 0.35)
    for sx in (-1, 1):
        barra(0.5 + sx * 0.162, 0.5, 0.028, 0.112, 0.013, CIAN, 1.2)
        barra(0.5 + sx * 0.234, 0.5, 0.022, 0.078, 0.010, VIOLETA, 1.2)
    return fs


def render(tam, escala=1.0):
    fs = figuras(escala)
    paso = 1.0 / tam
    borde = paso / MUESTRAS          # anchura de un subpíxel, para el antialias
    filas = bytearray()

    for y in range(tam):
        filas.append(0)                                  # filtro PNG "none"
        fila = bytearray()
        for x in range(tam):
            acum = [0.0, 0.0, 0.0]
            for sy in range(MUESTRAS):
                for sx in range(MUESTRAS):
                    px = (x + (sx + 0.5) / MUESTRAS) * paso
                    py = (y + (sy + 0.5) / MUESTRAS) * paso

                    # fondo con un halo azul difuso arriba
                    r = math.hypot(px - 0.5, py - 0.30)
                    halo = math.exp(-r * 3.2) * 0.16
                    col = [FONDO[i] + (CIAN[i] - FONDO[i]) * halo for i in range(3)]

                    for sdf, color, brillo in fs:
                        d = sdf((px, py))
                        if d > 0:                        # resplandor alrededor
                            g = math.exp(-d / 0.030) * 0.40 * brillo
                            for i in range(3):
                                col[i] = min(255, col[i] + (color[i] - col[i]) * g)
                        a = min(1.0, max(0.0, 0.5 - d / borde))   # relleno con borde suave
                        if a > 0:
                            for i in range(3):
                                col[i] = col[i] + (color[i] - col[i]) * a
                    for i in range(3):
                        acum[i] += col[i]
            n = MUESTRAS * MUESTRAS
            fila += bytes(int(max(0, min(255, c / n)) + 0.5) for c in acum)
        filas += fila
    return bytes(filas)


def png(ruta, tam, escala=1.0):
    crudo = render(tam, escala)

    def trozo(tag, datos):
        return (struct.pack(">I", len(datos)) + tag + datos
                + struct.pack(">I", zlib.crc32(tag + datos) & 0xFFFFFFFF))

    blob = (b"\x89PNG\r\n\x1a\n"
            + trozo(b"IHDR", struct.pack(">IIBBBBB", tam, tam, 8, 2, 0, 0, 0))
            + trozo(b"IDAT", zlib.compress(crudo, 9))
            + trozo(b"IEND", b""))
    with open(ruta, "wb") as f:
        f.write(blob)
    print(f"{ruta}  {tam}x{tam}  {len(blob)} bytes")


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    png(f"{SALIDA}/icon-512.png", 512)
    png(f"{SALIDA}/icon-192.png", 192)
    png(f"{SALIDA}/apple-touch-icon.png", 180)
    png(f"{SALIDA}/favicon-32.png", 32)
    # Android recorta un círculo: el contenido se encoge a la zona segura.
    png(f"{SALIDA}/icon-maskable-512.png", 512, escala=0.66)
