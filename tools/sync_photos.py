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

Clips (.mov, .mp4) are downloaded and compressed to small MP4s (longest side 960 px) with a poster frame.
That needs ffmpeg: on the PATH, in the FFMPEG environment variable, or from pip install imageio-ffmpeg.
Without ffmpeg the photos still sync and clips are skipped. Large downloads go to the folder in AKC_TMP
(default: the system temp folder), so point it at a drive with space.
Files are named after the Drive file, so a re-run downloads only what is new.

Run from the site folder:   python -I tools/sync_photos.py
Only the yellow list:       python -I tools/sync_photos.py --residents-only
Needs: Python 3 with Pillow and openpyxl (pip install pillow openpyxl); pillow-heif is optional, for iPhone photos Drive has no preview of yet.
"""
import datetime
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

import openpyxl
from PIL import Image, ImageOps

SHEET_ID = "1LFBVHk6D9GHRL2BPJldPS-qql6UkGWmlpr8B-0B1J70"
TAB = "Cat_profile"
# the team's shared "รูปแมวอักษร" folder: one subfolder per cat. Used when a cat's Photo cell has no link.
PARENT_FOLDER = "1GbIIACrwa_pIDQeCM0DFZAJMFLOamww-"
MAX_ITEMS = 60          # per cat, photos and clips together (the profile shows 8 thumbnails, the rest in the slideshow)
THUMB, SMALL, LARGE = 240, 480, 1200  # longest side in px (t: list cards, s: cards on big screens, l: profile)
OUT_DIR = os.path.join("photos", "cats")
MANIFEST = os.path.join("photos", "manifest.js")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp")
VIDEO_EXT = (".mov", ".mp4", ".m4v")
VIDEO_SIDE, VIDEO_CRF = 960, 28  # longest side in px, x264 quality (higher = smaller file)
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
        if name:
            yield name, link if link.startswith("http") else ""


def subfolders(folder_id):
    """{folder name: id} for the folders inside a shared Drive folder."""
    html = fetch(f"https://drive.google.com/embeddedfolderview?id={folder_id}").decode("utf-8", "replace")
    return {t.strip(): fid for fid, t in re.findall(r'folders/([A-Za-z0-9_-]+)[^>]*>.*?flip-entry-title">([^<]*)<', html, re.S)}


def folder_media(folder_id):
    """[(file id, name, "image" | "video")] in a shared Drive folder: a cover photo first, then photos, then clips."""
    html = fetch(f"https://drive.google.com/embeddedfolderview?id={folder_id}").decode("utf-8", "replace")
    # each entry: <a href=".../file/d/ID/view..."> ... <div class="flip-entry-title">NAME</div>
    entries = re.findall(r'file/d/([A-Za-z0-9_-]+)/view.*?flip-entry-title">([^<]*)<', html, re.S)
    seen, out = set(), []
    for fid, title in entries:
        low = title.lower()
        kind = "image" if low.endswith(IMAGE_EXT) else "video" if low.endswith(VIDEO_EXT) else ""
        base = re.sub(r"\s*\(\d+\)(?=\.[^.]+$)", "", title)  # "IMG_7984(1).JPG" is a second copy of IMG_7984.JPG
        if kind and fid not in seen and base not in seen:
            seen.update((fid, base))
            out.append((fid, title, kind))
    # a file whose name starts with "cover" (e.g. cover.jpg, cover_IMG_1140.HEIC) becomes the cat's cover photo
    return sorted(out, key=lambda e: (not e[1].lower().startswith("cover"), e[2] == "video", e[1]))


def find_ffmpeg():
    exe = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # pip install imageio-ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return ""


def sizes_from(img, stem):
    img = ImageOps.exif_transpose(img).convert("RGB")
    paths = {}
    for label, size in (("t", THUMB), ("s", SMALL), ("l", LARGE)):
        copy = img.copy()
        copy.thumbnail((size, size))
        path = f"{OUT_DIR}/{stem}-{label}.jpg"
        copy.save(path, "JPEG", quality=78, optimize=True, progressive=True)
        paths[label] = path.replace(os.sep, "/")
    return paths


def done_sizes(stem):
    paths = {label: f"{OUT_DIR}/{stem}-{label}.jpg".replace(os.sep, "/") for label in "tsl"}
    return paths if all(os.path.exists(p) for p in paths.values()) else None


def download(file_id, path):
    """The original file from Drive (works for large files too)."""
    req = urllib.request.Request(f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t", headers=UA)
    with urllib.request.urlopen(req, timeout=600) as r, open(path, "wb") as fh:
        shutil.copyfileobj(r, fh, 1 << 20)


def save_photo(file_id, stem):
    """Three JPEG sizes of a Drive photo. Skipped if already saved.
    Drive's preview converts HEIC for us; when Drive has no preview yet, the original is converted here
    (HEIC then needs pip install pillow-heif)."""
    done = done_sizes(stem)
    if done:
        return done
    try:
        return sizes_from(Image.open(io.BytesIO(fetch(f"https://drive.google.com/thumbnail?id={file_id}&sz=w{LARGE}"))), stem)
    except urllib.error.HTTPError:
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            pass
        tmp = tempfile.mkdtemp(dir=os.environ.get("AKC_TMP") or None)
        try:
            src = os.path.join(tmp, "src")
            download(file_id, src)
            with Image.open(src) as img:
                return sizes_from(img, stem)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


def clip_poster(mp4, stem, ffmpeg, tmp):
    """The clip's cover frame, about a third of the way in (the first second is often the floor)."""
    probe = subprocess.run([ffmpeg, "-i", mp4], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe)
    at = (int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))) * 0.3 if m else 1
    frame = os.path.join(tmp, "poster.jpg")
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", mp4, "-frames:v", "1", "-q:v", "2", frame], check=True)
    if not os.path.exists(frame):
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", mp4, "-frames:v", "1", "-q:v", "2", frame], check=True)
    with Image.open(frame) as img:
        return sizes_from(img, stem)


def save_clip(file_id, stem, ffmpeg):
    """A compressed MP4 of a Drive clip, plus a cover frame in the three photo sizes. Skipped if already saved."""
    mp4 = f"{OUT_DIR}/{stem}.mp4".replace(os.sep, "/")
    poster = done_sizes(stem)
    if poster and os.path.exists(mp4):
        return dict(poster, v=mp4)
    tmp = tempfile.mkdtemp(dir=os.environ.get("AKC_TMP") or None)
    try:
        if not os.path.exists(mp4):
            src = os.path.join(tmp, "src")
            download(file_id, src)
            side = f"scale='if(gt(iw,ih),min({VIDEO_SIDE},iw),-2)':'if(gt(iw,ih),-2,min({VIDEO_SIDE},ih))'"
            subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", src, "-map", "0:v:0", "-map", "0:a:0?", "-vf", side + ",format=yuv420p",
                            "-c:v", "libx264", "-preset", "slow", "-crf", str(VIDEO_CRF), "-c:a", "aac", "-b:a", "64k", "-ac", "1",
                            "-movflags", "+faststart", mp4], check=True)
        return dict(clip_poster(mp4, stem, ffmpeg, tmp), v=mp4)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


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
    try:
        shared = subfolders(PARENT_FOLDER)
    except Exception as e:
        shared = {}
        print(f"  ! could not list the shared photo folder: {e}", file=sys.stderr)
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print("  ! no ffmpeg found: clips are skipped (pip install imageio-ffmpeg)", file=sys.stderr)
    for name, link in sheet_rows(rows, cols):
        if not link and name in shared:  # no link in the sheet: use the cat's folder in the shared photo folder
            link = f"https://drive.google.com/drive/folders/{shared[name]}"
        if not link:
            continue
        key = hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]  # ASCII file names for any Thai cat name
        m_folder = re.search(r"/folders/([A-Za-z0-9_-]+)", link)
        m_file = re.search(r"/file/d/([A-Za-z0-9_-]+)", link)
        files = folder_media(m_folder.group(1))[:MAX_ITEMS] if m_folder else ([(m_file.group(1), "", "image")] if m_file else [])
        items, clips = [], 0
        for fid, title, kind in files:
            stem = f"{key}-{hashlib.sha1(fid.encode()).hexdigest()[:8]}"  # named after the Drive file, so re-runs skip it
            if kind == "video" and not ffmpeg:
                continue
            try:
                p = save_clip(fid, stem, ffmpeg) if kind == "video" else save_photo(fid, stem)
                items.append(p)
                used.update(p.values())
                clips += kind == "video"
            except Exception as e:  # one bad file should not stop the sync
                print(f"  ! {name} {title or fid}: {e}", file=sys.stderr)
        if items:
            manifest[name] = items
        print(f"{name}: {len(items) - clips} photo(s), {clips} clip(s)")
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
    print(f"wrote {MANIFEST}: {sum(len(v) for v in manifest.values())} photos and clips for {len(manifest)} cats")


if __name__ == "__main__":
    main()
