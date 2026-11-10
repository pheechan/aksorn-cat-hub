"""Draws the หนูดำ doodle mascot and writes mascot.svg (a sprite of <symbol>s).

Each pose is built from soft blobs (ellipses, tapered limbs, ear triangles), merged into one
silhouette, rounded at the joins, given a slight hand-drawn wobble and smoothed into curves.
Faces (white eyes with dark pupils, whiskers, a small mouth) sit on top.

Colours are CSS variables so the same drawing works on light and dark pages:
  --cat (coat), --cat-eye (eye whites, whiskers, mouth), --cat-pupil (pupils).

Usage:  python tools/mascot.py            -> writes mascot.svg next to index.html
        python tools/mascot.py --preview  -> also writes tools/mascot-preview.html
After changing mascot.svg, paste its <symbol>s into index.html and cats.html (see README).
Needs: pip install shapely
"""
import math
import sys
from pathlib import Path

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
from shapely import affinity

ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------- shapes
def ell(cx, cy, rx, ry, rot=0):
    e = affinity.scale(Point(0, 0).buffer(1, 64), rx, ry)
    return affinity.translate(affinity.rotate(e, rot, origin=(0, 0)), cx, cy)


def limb(pts, radii):
    """A tapered tube through pts (radius per point): hull of each pair of circles."""
    if isinstance(radii, (int, float)):
        radii = [radii] * len(pts)
    # densify along a Catmull-Rom curve so bends look smooth
    dense, rr = [], []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        for k in range(8):
            t = k / 8
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            dense.append((x, y)); rr.append(radii[i] + (radii[i + 1] - radii[i]) * t)
    dense.append(pts[-1]); rr.append(radii[-1])
    circles = [Point(p).buffer(r, 32) for p, r in zip(dense, rr)]
    return unary_union([unary_union([a, b]).convex_hull for a, b in zip(circles, circles[1:])])


def tri(*p):
    return Polygon(p)


# ---------------------------------------------------------------- outline -> smooth wobbly path
def wobble(coords, amp, seed):
    """Resample a ring every ~1.6 units and push points along the normal by a low-frequency wave."""
    pts = list(coords)[:-1]
    out = []
    n = len(pts)
    total = sum(math.dist(pts[i], pts[(i + 1) % n]) for i in range(n))
    step = 1.6
    acc = 0.0
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        seg = math.dist(a, b)
        if seg == 0:
            continue
        t = 0.0
        while t < seg:
            x = a[0] + (b[0] - a[0]) * t / seg
            y = a[1] + (b[1] - a[1]) * t / seg
            s = (acc + t) / total * 2 * math.pi
            d = amp * (math.sin(3 * s + seed) * 0.5 + math.sin(7 * s + seed * 2.3) * 0.35 + math.sin(13 * s + seed * 0.7) * 0.15)
            nx, ny = (b[1] - a[1]) / seg, -(b[0] - a[0]) / seg
            out.append((x + nx * d, y + ny * d))
            t += step
        acc += seg
    return out


def smooth_path(pts, every=3):
    """Closed Catmull-Rom through every n-th point, written as cubic Béziers."""
    p = pts[::every]
    n = len(p)
    f = lambda v: f"{v:.1f}".rstrip("0").rstrip(".")
    d = [f"M{f(p[0][0])} {f(p[0][1])}"]
    for i in range(n):
        p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    return "".join(d) + "Z"


def silhouette(parts, seed=1.0, fillet=4.0, tip=1.2, amp=0.9):
    g = unary_union(parts)
    g = g.buffer(fillet, 32).buffer(-fillet, 32)      # fill the joins between blobs
    g = g.buffer(-tip, 32).buffer(tip, 32)            # soften needle-sharp tips
    polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
    d = ""
    for k, poly in enumerate(polys):
        d += smooth_path(wobble(poly.exterior.coords, amp, seed + k))
        for j, hole in enumerate(poly.interiors):
            d += smooth_path(wobble(hole.coords, amp * 0.6, seed + 5 + j))
    return d, g.bounds


# ---------------------------------------------------------------- face pieces
def face(eyes, pupils, whiskers, mouth=None, closed=False, r=7.2, pr=3.6):
    """eyes: [(x,y)], pupils: [(dx,dy)] offsets, whiskers: list of [(x1,y1),(x2,y2)], mouth: (x,y,w)."""
    s = []
    if closed:
        arcs = "".join(f"M{x - r:.1f} {y:.1f}q{r:.1f} {r * 0.75:.1f} {2 * r:.1f} 0" for x, y in eyes)
        s.append(f'<path d="{arcs}" style="fill:none;stroke:var(--cat-eye,#fff);stroke-width:2.6;stroke-linecap:round"/>')
    else:
        s.append("".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" style="fill:var(--cat-eye,#fff)"/>' for x, y in eyes))
        s.append("".join(f'<circle cx="{x + dx:.1f}" cy="{y + dy:.1f}" r="{pr}" style="fill:var(--cat-pupil,#16181d)"/>' for (x, y), (dx, dy) in zip(eyes, pupils)))
    if whiskers:
        w = "".join(f"M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" for a, b in whiskers)
        s.append(f'<path d="{w}" style="fill:none;stroke:var(--cat-eye,#fff);stroke-width:1.9;stroke-linecap:round"/>')
    if mouth:
        x, y, w = mouth
        s.append(f'<path d="M{x - w:.1f} {y:.1f}q{w / 2:.1f} {w * 0.8:.1f} {w:.1f} 0q{w / 2:.1f} {w * 0.8:.1f} {w:.1f} 0" style="fill:none;stroke:var(--cat-eye,#fff);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>')
    return "".join(s)


def whisk(cx, cy, side, n=2, spread=5.5, length=9, tilt=0.0):
    """short cheek whiskers, drawn inward from the cheek edge (side=-1 left, 1 right)."""
    out = []
    for i in range(n):
        y = cy + (i - (n - 1) / 2) * spread
        ang = (i - (n - 1) / 2) * 0.22 * side + tilt
        x2 = cx + side * length * math.cos(ang)
        y2 = y + length * math.sin(ang)
        out.append(((cx, y), (x2, y2)))
    return out


def head(cx, cy, rx, ry, lear, rear):
    """lear/rear: (base_inner, base_outer, tip) as offsets from the head centre."""
    parts = [ell(cx, cy, rx, ry)]
    for e in (lear, rear):
        parts.append(tri(*[(cx + x, cy + y) for x, y in e]))
    return parts


# ---------------------------------------------------------------- poses (y points down)
POSES = {}


def pose(name, seed):
    def deco(fn):
        POSES[name] = (fn, seed)
        return fn
    return deco


@pose("nd-head", 1.3)
def p_head():
    parts = head(50, 56, 36, 29, [(-30, -10), (-6, -27), (-33, -48)], [(6, -27), (30, -10), (34, -47)])
    feats = face([(37, 57), (63, 57)], [(1.5, 1.2), (1.5, 1.2)],
                 whisk(20, 66, 1, 2, 4.5, 6.5, -0.1) + whisk(80, 66, -1, 2, 4.5, 6.5, 0.1), (50, 66, 4), r=8.4, pr=4.4)
    return parts, feats


@pose("nd-sit", 2.1)
def p_sit():
    parts = head(94, 48, 36, 29, [(-29, -9), (-6, -27), (-32, -48)], [(6, -27), (28, -11), (33, -47)])
    parts += [
        ell(96, 104, 30, 38, -6),                      # chest and body
        ell(114, 126, 30, 22, -10),                    # haunch
        limb([(84, 92), (82, 120), (82, 146)], [10, 9, 9]),   # front legs
        limb([(102, 96), (103, 122), (104, 146)], [9.5, 9, 9]),
        ell(84, 146, 11, 6), ell(105, 146, 11, 6),     # paws
        ell(122, 142, 28, 8),                          # seat
        limb([(140, 142), (160, 140), (171, 124), (168, 104), (158, 96)], [8, 7.5, 7, 6.5, 6]),  # tail curling up
    ]
    feats = face([(81, 50), (107, 50)], [(1.8, 1.5), (1.8, 1.5)],
                 whisk(62, 59, 1, 2, 4.5, 6, -0.1) + whisk(126, 59, -1, 2, 4.5, 6, 0.1), (94, 60, 3.6), r=8, pr=4.1)
    return parts, feats


@pose("nd-walk", 3.7)
def p_walk():
    parts = head(62, 54, 33, 27, [(-27, -8), (-6, -24), (-28, -44)], [(6, -24), (26, -9), (32, -42)])
    parts += [
        ell(82, 96, 24, 23),                           # chest
        ell(116, 98, 40, 22, 2),                       # body
        limb([(72, 106), (70, 122), (66, 136)], [9.5, 9, 9]),          # front legs, one stepping forward
        limb([(92, 110), (95, 124), (97, 134)], [8.5, 8, 8]),
        limb([(128, 110), (127, 124), (124, 136)], [10, 9, 9]),        # back legs
        limb([(142, 104), (150, 118), (148, 133)], [11, 9, 8.5]),
        limb([(152, 82), (166, 66), (170, 44), (165, 28), (155, 27), (152, 35)], [8, 7, 6.5, 6, 5.5, 5]),  # tail up, curled tip
    ]
    feats = face([(50, 56), (74, 56)], [(-1.8, 1.4), (-1.8, 1.4)],
                 whisk(33, 65, 1, 2, 4.5, 6, -0.1) + whisk(91, 65, -1, 2, 4.5, 6, 0.1), (62, 65, 3.4), r=7.4, pr=3.8)
    return parts, feats


def loaf(closed):
    parts = head(64, 76, 30, 25, [(-26, -7), (-6, -22), (-28, -40)], [(6, -22), (24, -9), (28, -39)])
    parts += [
        ell(120, 108, 58, 28),                         # body, lying down
        ell(88, 112, 30, 24),
        limb([(70, 122), (52, 130), (34, 132)], [10, 9, 8.5]),         # front paws stretched out
        limb([(88, 126), (68, 134), (54, 136)], [9, 8.5, 8]),
        ell(118, 132, 56, 6),                          # flat underside
        limb([(174, 110), (190, 96), (192, 74), (182, 62), (170, 66), (171, 78)], [8.5, 7.5, 7, 6.5, 6, 5.5]),  # tail curl
    ]
    feats = face([(52, 78), (75, 78)], [(1.6, -0.8), (1.6, -0.8)],
                 whisk(37, 85, 1, 2, 4.5, 6, -0.1) + whisk(91, 85, -1, 2, 4.5, 6, 0.1), None if closed else (64, 87, 3.2),
                 closed=closed, r=6.6, pr=3.3)
    return parts, feats


@pose("nd-loaf", 4.4)
def p_loaf():
    return loaf(False)


@pose("nd-sleep", 4.4)
def p_sleep():
    return loaf(True)


@pose("nd-stretch", 5.9)
def p_stretch():
    parts = head(150, 92, 29, 24, [(-25, -6), (-6, -21), (-25, -40)], [(6, -21), (24, -8), (28, -38)])
    parts += [
        limb([(54, 82), (90, 96), (126, 110)], [24, 21, 17]),          # body sloping down to the front
        limb([(130, 116), (156, 128), (184, 130)], [9, 8.5, 8]),       # front legs flat on the ground
        limb([(124, 120), (146, 132), (172, 136)], [8.5, 8, 7.5]),
        limb([(46, 92), (42, 116), (40, 138)], [11, 9.5, 9]),          # back legs standing
        limb([(66, 98), (64, 120), (62, 138)], [10, 9, 8.5]),
        limb([(40, 74), (28, 56), (24, 34), (30, 20)], [8, 7, 6.5, 6]),  # tail up
    ]
    feats = face([(139, 94), (162, 94)], [(-1.4, -1.8), (-1.4, -1.8)],
                 whisk(125, 102, 1, 2, 4.5, 6, -0.1) + whisk(176, 102, -1, 2, 4.5, 6, 0.1), (150, 103, 3.2), r=7, pr=3.6)
    return parts, feats


@pose("nd-play", 6.6)
def p_play():
    parts = head(84, 48, 34, 28, [(-28, -8), (-6, -25), (-32, -45)], [(6, -25), (27, -10), (30, -46)])
    parts += [
        ell(90, 102, 30, 37, 8),                       # body leaning back a little
        ell(104, 128, 30, 20),                         # haunch
        limb([(80, 94), (78, 122), (76, 146)], [10, 9, 9]),            # standing front leg
        ell(76, 146, 11, 6),
        limb([(104, 90), (122, 76), (132, 60)], [9.5, 8.5, 8.5]),      # raised paw, waving
        ell(133, 57, 9.5, 9),
        ell(108, 142, 30, 8),
        limb([(132, 140), (150, 146), (166, 140), (172, 126)], [8, 7.5, 7, 6.5]),
    ]
    feats = face([(71, 50), (96, 50)], [(1.8, -1.6), (1.8, -1.6)],
                 whisk(54, 59, 1, 2, 4.5, 6, -0.1) + whisk(114, 59, -1, 2, 4.5, 6, 0.1), (84, 60, 3.4), r=7.8, pr=4)
    return parts, feats


@pose("nd-peek", 7.2)
def p_peek():
    parts = head(70, 58, 34, 28, [(-28, -9), (-6, -26), (-32, -46)], [(6, -26), (28, -11), (32, -45)])
    parts += [ell(70, 92, 30, 12), ell(48, 92, 11, 9), ell(92, 92, 11, 9)]  # shoulders and paws over the edge
    feats = face([(57, 58), (83, 58)], [(0, 2.2), (0, 2.2)],
                 whisk(40, 67, 1, 2, 4.5, 6.5, -0.1) + whisk(100, 67, -1, 2, 4.5, 6.5, 0.1), (70, 68, 3.8), r=8, pr=4.2)
    feats += '<path d="M10 100H130" style="fill:none;stroke:var(--cat,#16181d);stroke-width:3.4;stroke-linecap:round"/>'
    return parts, feats


# ---------------------------------------------------------------- write
def build():
    out = []
    for name, (fn, seed) in POSES.items():
        parts, feats = fn()
        d, (x0, y0, x1, y1) = silhouette(parts, seed)
        if name == "nd-peek":
            x0, x1, y1 = min(x0, 8), max(x1, 132), max(y1, 102)
        pad = 2
        vb = f"{x0 - pad:.0f} {y0 - pad:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad:.0f}"
        out.append(f'  <symbol id="{name}" viewBox="{vb}">\n    <path d="{d}" fill-rule="evenodd" style="fill:var(--cat,#16181d)"/>\n    {feats}\n  </symbol>')
    return out


HEADER = """<!-- หนูดำ (Nu Dam), the faculty's best-known black cat, as a doodle mascot. Generated by tools/mascot.py.
     Colours come from CSS variables: --cat (coat), --cat-eye (eye whites, whiskers), --cat-pupil (pupils).
     Poses: nd-head (logo), nd-sit, nd-walk, nd-loaf, nd-sleep, nd-stretch, nd-play, nd-peek. -->"""

if __name__ == "__main__":
    symbols = build()
    svg = HEADER + '\n<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">\n' + "\n".join(symbols) + "\n</svg>\n"
    (ROOT / "mascot.svg").write_text(svg, encoding="utf-8")
    print("wrote mascot.svg with", len(symbols), "poses")
    if "--preview" in sys.argv:
        cells = "".join(f'<figure><svg><use href="#{n}"/></svg><figcaption>{n}</figcaption></figure>' for n in POSES)
        html = f"""<!doctype html><meta charset="utf-8"><style>
body{{margin:0;font:14px system-ui;display:grid;grid-template-columns:1fr 1fr}}
.row{{display:flex;flex-wrap:wrap;gap:8px;padding:16px}} figure{{margin:0;text-align:center}} svg{{width:200px;height:160px}}
.light{{background:#fff;--cat:#16181d}} .dark{{background:#0f1115;color:#ddd;--cat:#e8923f;--cat-pupil:#16181d}}
.big svg{{width:440px;height:340px}}</style>{svg}
<div class="row light">{cells}</div><div class="row dark">{cells}</div>
<div class="row light big"><figure><svg><use href="#nd-sit"/></svg></figure><figure><svg><use href="#nd-walk"/></svg></figure></div>
<div class="row light" style="align-items:center"><svg style="width:40px;height:40px"><use href="#nd-head"/></svg><svg style="width:28px;height:28px"><use href="#nd-head"/></svg></div>"""
        (ROOT / "tools" / "mascot-preview.html").write_text(html, encoding="utf-8")
        print("wrote tools/mascot-preview.html")
