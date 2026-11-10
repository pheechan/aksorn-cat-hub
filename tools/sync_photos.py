"""Sync cat photos from the team's Google Drive folders into the website.

The Photo column of the team sheet (tab Cat_profile) links each cat to a Google Drive
folder. Browsers cannot list Drive folders or show iPhone HEIC photos, so this script:
  1. downloads the sheet as .xlsx (CSV exports drop hyperlinks),
  2. lists the images in each linked folder (folders must be shared "anyone with the link"),
  3. asks Drive for JPEG renditions (this also converts HEIC),
  4. saves two sizes per photo in photos/cats/ (small for grids, large for profiles),
  5. writes photos/manifest.js, which the site loads.
It also reads which names the team highlighted yellow (= the faculty's own cats, "แมวประจำคณะ")
into window.CAT_RESIDENTS in the same file, since a CSV export cannot carry cell colours.

Run from the site folder:   python -I tools/sync_photos.py
Only the yellow list:       python -I tools/sync_photos.py --residents-only
Needs: Python 3 with Pillow and openpyxl (pip install pillow openpyxl).
"""
import datetime
import hashlib
import io
import json
import os
import re
import sys
import urllib.request

import openpyxl
from PIL import Image, ImageOps

SHEET_ID = "1LFBVHk6D9GHRL2BPJldPS-qql6UkGWmlpr8B-0B1J70"
TAB = "Cat_profile"
MAX_PHOTOS = 8          # per cat
THUMB, SMALL, LARGE = 240, 480, 1200  # longest side in px (t: list cards, s: cards on big screens, l: profile)
OUT_DIR = os.path.join("photos", "cats")
MANIFEST = os.path.join("photos", "manifest.js")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp")
UA = {"User-Agent": "Mozilla/5.0 (aksorn-cat-hub photo sync)"}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def load_sheet():
    data = fetch(f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx")
    ws = openpyxl.load_workbook(io.BytesIO(data))[TAB]
    rows = list(ws.iter_rows())
    head = next(i for i, r in enumerate(rows) if any(str(c.value or "").strip().lower() == "name" for c in r))
    cols = {str(c.value or "").strip().lower(): j for j, c in enumerate(rows[head])}
    return rows[head + 1:], cols


def is_yellow(cell):
    """True for a yellow fill (bright or pale), the team's mark for the faculty's own cats."""
    fill = cell.fill
    if not fill or fill.fill_type != "solid" or fill.fgColor is None or fill.fgColor.type != "rgb":
        return False
    rgb = str(fill.fgColor.rgb or "")[-6:]
    try:
        r, g, b = (int(rgb[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return False
    return r > 200 and g > 200 and b < 120


def residents(rows, cols):
    name_i = cols["name"]
    return [str(r[name_i].value).strip() for r in rows if r[name_i].value and is_yellow(r[name_i])]


def sheet_rows(rows, cols):
    name_i, photo_i = cols["name"], cols["photo"]
    for r in rows:
        name = str(r[name_i].value or "").strip()
        cell = r[photo_i]
        link = cell.hyperlink.target if cell.hyperlink else str(cell.value or "")
        if name and link.startswith("http"):
            yield name, link


def folder_images(folder_id):
    html = fetch(f"https://drive.google.com/embeddedfolderview?id={folder_id}").decode("utf-8", "replace")
    # each entry: <a href=".../file/d/ID/view..."> ... <div class="flip-entry-title">NAME</div>
    entries = re.findall(r'file/d/([A-Za-z0-9_-]+)/view.*?flip-entry-title">([^<]*)<', html, re.S)
    seen, out = set(), []
    for fid, title in entries:
        if fid not in seen and title.lower().endswith(IMAGE_EXT):
            seen.add(fid)
            out.append((fid, title))
    # a file whose name starts with "cover" (e.g. cover.jpg, cover_IMG_1140.HEIC) becomes the cat's cover photo
    return sorted(out, key=lambda e: (not e[1].lower().startswith("cover"), e[1]))


def save_sizes(file_id, stem):
    img = Image.open(io.BytesIO(fetch(f"https://drive.google.com/thumbnail?id={file_id}&sz=w{LARGE}")))
    img = ImageOps.exif_transpose(img).convert("RGB")
    paths = {}
    for label, size in (("t", THUMB), ("s", SMALL), ("l", LARGE)):
        copy = img.copy()
        copy.thumbnail((size, size))
        path = f"{OUT_DIR}/{stem}-{label}.jpg"
        copy.save(path, "JPEG", quality=78, optimize=True, progressive=True)
        paths[label] = path.replace(os.sep, "/")
    return paths


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Thai cat names on a Windows console
    sys.stderr.reconfigure(encoding="utf-8")
    os.makedirs(OUT_DIR, exist_ok=True)
    rows, cols = load_sheet()
    homes = residents(rows, cols)
    print("highlighted yellow (faculty cats): " + ", ".join(homes))
    line = "window.CAT_RESIDENTS = " + json.dumps(homes, ensure_ascii=False) + ";\n"
    if "--residents-only" in sys.argv:  # keep the photos, refresh only the yellow list
        with open(MANIFEST, encoding="utf-8") as fh:
            kept = [x for x in fh.read().splitlines() if not x.startswith("window.CAT_RESIDENTS")]
        with open(MANIFEST, "w", encoding="utf-8") as fh:
            fh.write("\n".join(kept) + "\n" + line)
        print(f"updated the yellow list in {MANIFEST}")
        return
    manifest, used = {}, set()
    for name, link in sheet_rows(rows, cols):
        key = hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]  # ASCII file names for any Thai cat name
        m_folder = re.search(r"/folders/([A-Za-z0-9_-]+)", link)
        m_file = re.search(r"/file/d/([A-Za-z0-9_-]+)", link)
        files = folder_images(m_folder.group(1))[:MAX_PHOTOS] if m_folder else ([(m_file.group(1), "")] if m_file else [])
        photos = []
        for n, (fid, _) in enumerate(files, 1):
            try:
                p = save_sizes(fid, f"{key}-{n}")
                photos.append(p)
                used.update(p.values())
            except Exception as e:  # one bad file should not stop the sync
                print(f"  ! {name} file {fid}: {e}", file=sys.stderr)
        if photos:
            manifest[name] = photos
        print(f"{name}: {len(photos)} photo(s)")
    # remove photos of cats or files that are no longer in the sheet
    for f in os.listdir(OUT_DIR):
        p = f"{OUT_DIR}/{f}".replace(os.sep, "/")
        if p not in used:
            os.remove(os.path.join(OUT_DIR, f))
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        fh.write("// Generated by tools/sync_photos.py from the team's Google Drive folders. Do not edit by hand.\n")
        fh.write("window.CAT_PHOTO_SETS = " + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n")
        fh.write("window.CAT_PHOTO_SYNCED = " + json.dumps(datetime.date.today().isoformat()) + ";\n")
        fh.write(line)
    print(f"wrote {MANIFEST}: {sum(len(v) for v in manifest.values())} photos for {len(manifest)} cats")


if __name__ == "__main__":
    main()
