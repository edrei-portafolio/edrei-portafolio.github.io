#!/usr/bin/env python3
"""Genera variantes responsivas (srcset) de las imágenes del portafolio.

Para cada imagen escribe <nombre>-640.webp y <nombre>-1200.webp (solo si la fuente es
más ancha que ese ancho), WebP calidad 80, method 6, conservando el alfa.
Las seis imágenes app-*-cad también reciben <nombre>-480.webp.

Uso:
  python3 tools/variants.py                         # lista por defecto en assets/img
  python3 tools/variants.py ruta/imagen.webp [...]  # imágenes concretas
  python3 tools/variants.py img.webp --widths 480,960

Las rutas relativas se resuelven desde la raíz del repo (o desde assets/img).
Correr tools/termico.py antes, para que existan las versiones *-termico.
Requiere Pillow.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

DEFAULT = [
    "linea-impulsor", "linea-carcasa", "planetario-diseno", "app-producto-cad",
    "macro-simulacion-termico", "app-id-termico", "planetario-simulacion-termico",
    "planetario-fabricado", "app-producto", "macro-fabricado", "soporte-diseno",
    "soporte-simulacion-termico", "soporte-fabricado",
]
CAD = ["app-agro-cad", "app-automatizacion-cad", "app-id-cad",
       "app-mantenimiento-cad", "app-mineria-cad", "app-producto-cad"]


def variant(src, width):
    im = Image.open(src)
    if im.width <= width:
        return None
    im.load()
    mode = "RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB"
    im = im.convert(mode)
    h = round(im.height * width / im.width)
    out = im.resize((width, h), Image.LANCZOS)
    dst = src.with_name(f"{src.stem}-{width}.webp")
    out.save(dst, "WEBP", quality=80, method=6)
    print(f"{dst.name}  {width}x{h}")
    return dst


def resolve(p):
    p = Path(p)
    if p.suffix == "":
        p = p.with_suffix(".webp")
    for c in (p, ROOT / p, IMG / p):
        if c.exists():
            return c
    raise SystemExit(f"no existe: {p}")


def main(argv):
    ap = argparse.ArgumentParser(description="Variantes responsivas WebP.")
    ap.add_argument("inputs", nargs="*")
    ap.add_argument("--widths", default="640,1200")
    args = ap.parse_args(argv)
    widths = [int(w) for w in args.widths.split(",")]
    if args.inputs:
        for i in args.inputs:
            for w in widths:
                variant(resolve(i), w)
        return
    for n in DEFAULT:
        for w in (640, 1200):
            variant(resolve(n), w)
    for n in CAD:
        variant(resolve(n), 480)


if __name__ == "__main__":
    main(sys.argv[1:])
