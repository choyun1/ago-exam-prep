#!/usr/bin/env python3
"""Bundle the site into one self-contained HTML body (for hosting as a single file / embedding).
Usage: python3 -I scripts/build-single.py [out.html]"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text()
css = (root / "css/style.css").read_text()
body = re.search(r"<!--BODY-->(.*)<!--/BODY-->", src, re.S).group(1)
order = ["theory", "harmony", "generators", "drills", "audio", "levels", "facts", "app"]
js = "\n".join((root / f"js/{n}.js").read_text() for n in order)
assert "</script" not in js.lower()
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', src).group(1)
out = f"""<title>AGO Exam Prep</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
{body}
<script src="https://cdn.jsdelivr.net/npm/abcjs@6.5.2/dist/abcjs-basic-min.js"></script>
<script>
{js}
</script>
"""
dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist/ago-exam-prep.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out)
print(dest, len(out) // 1024, "KB")
