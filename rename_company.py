import os

REPLACEMENTS = [
    ("Hue Muse Beauty", "Silku"),
    ("Hue Muse", "Silku"),
    ("HueMuseBeauty", "Silku"),
    ("huemusebeauty", "silku"),
    ("hue-muse-beauty", "silku"),
    ("HUE MUSE BEAUTY", "SILKU"),
    ("HUE MUSE", "SILKU"),
]

SKIP_DIRS = {"node_modules", ".git", "dist", ".next", "build", "coverage"}
TEXT_EXTS = {".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".env", ".yml", ".yaml"}

changed_files = []
total_replacements = 0

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        ext = os.path.splitext(fname)[1]
        if ext not in TEXT_EXTS:
            continue
        path = os.path.join(root, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except (UnicodeDecodeError, PermissionError):
            continue

        original = content
        file_count = 0
        for old, new in REPLACEMENTS:
            file_count += content.count(old)
            content = content.replace(old, new)

        if content != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            changed_files.append((path, file_count))
            total_replacements += file_count

print(f"Changed {len(changed_files)} files, {total_replacements} total replacements:")
for path, count in sorted(changed_files):
    print(f"  {count:3d}  {path}")
