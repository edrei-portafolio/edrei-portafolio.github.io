#!/usr/bin/env python3
"""Recolorea renders de simulación (FEA, mapa tipo arcoíris/jet) a la paleta del sitio.

Mantiene el sombreado y las líneas de malla del render original; solo cambia el color:
azul (frío) -> noche/cian -> blanco cian -> naranja (solo en los picos).
Los píxeles casi grises (fondo, piezas sin resultado) pasan a pizarra/niebla.
Conserva el canal alfa y guarda WebP calidad 82.

Uso:
  python3 tools/termico.py                      # procesa los 4 renders por defecto
  python3 tools/termico.py entrada.webp [...]   # salida: <nombre>-termico.webp junto a la entrada
  python3 tools/termico.py entrada.webp -o salida.webp --gamma 1.3

Opciones:
  -o/--out   archivo de salida (solo con una entrada)
  --gamma    exponente para t (t**gamma). >1 reduce el naranja en renders muy saturados.

Requiere numpy y Pillow. Las rutas relativas se resuelven desde la raíz del repo.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

STOPS = [(0.00, "#1d3a5a"), (0.30, "#2b6f92"), (0.60, "#4cdcf7"), (0.82, "#dff7f9"), (1.00, "#ff7a3d")]
SLATE, MIST = "#171c24", "#9ea8ae"

# fuente -> (salida, gamma). gamma 1.3 en app-id: el giroide está casi todo saturado.
DEFAULTS = {
    "macro-simulacion.webp": ("macro-simulacion-termico.webp", 1.0),
    "app-id.webp": ("app-id-termico.webp", 1.3),
    "planetario-simulacion.webp": ("planetario-simulacion-termico.webp", 1.0),
    "soporte-simulacion.webp": ("soporte-simulacion-termico.webp", 1.0),
}


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def ramp(t):
    out = np.zeros(t.shape + (3,), dtype=np.float32)
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        u = ((t - a) / (b - a))[m][:, None]
        out[m] = hex2rgb(ca) * (1 - u) + hex2rgb(cb) * u
    return out


def termico(src, dst, gamma=1.0):
    im = Image.open(src)
    has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
    a = np.asarray(im.convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3:]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = d / (mx + 1e-6)
    t = np.clip((240 - h) / 240, 0, 1)   # jet: azul (240) = 0 .. rojo (0) = 1
    t = np.where(h > 300, 1.0, t)        # rojos magenta -> caliente
    if gamma != 1.0:
        t = t ** gamma
    shade = np.clip(mx / 0.95, 0, 1)[..., None]
    col = ramp(t) * (0.55 + 0.45 * shade)
    L = ((mx + mn) / 2)[..., None]
    tint = hex2rgb(SLATE) * (1 - L) + hex2rgb(MIST) * L
    w = np.clip((s - 0.25) / 0.25, 0, 1)[..., None]
    res = np.clip(col * w + tint * (1 - w), 0, 1)
    out = (np.concatenate([res, alpha], -1) * 255 + 0.5).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    if not has_alpha:
        img = img.convert("RGB")
    dst = Path(dst)
    img.save(dst, "WEBP", quality=82, method=6)
    print(f"{dst.relative_to(ROOT) if dst.is_relative_to(ROOT) else dst}  {img.size[0]}x{img.size[1]}  gamma={gamma}")


def resolve(p):
    p = Path(p)
    if p.is_absolute() or p.exists():
        return p
    for base in (ROOT, IMG):
        if (base / p).exists():
            return base / p
    return ROOT / p


def main(argv):
    ap = argparse.ArgumentParser(description="Recolorea renders FEA a la paleta del sitio.")
    ap.add_argument("inputs", nargs="*")
    ap.add_argument("-o", "--out")
    ap.add_argument("--gamma", type=float)
    args = ap.parse_args(argv)
    if not args.inputs:
        for src, (dst, g) in DEFAULTS.items():
            termico(IMG / src, IMG / dst, args.gamma or g)
        return
    if args.out and len(args.inputs) != 1:
        ap.error("-o solo con una entrada")
    for i in args.inputs:
        src = resolve(i)
        dst = resolve(args.out) if args.out else src.with_name(src.stem + "-termico.webp")
        g = args.gamma or DEFAULTS.get(src.name, (None, 1.0))[1]
        termico(src, dst, g)


if __name__ == "__main__":
    main(sys.argv[1:])
