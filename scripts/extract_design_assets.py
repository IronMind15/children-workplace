"""
知识岛 · 设计稿资源提取脚本
把 112初版 的岛屿插画 + 113背景 的岛屿背景，压缩成 WebP 落到 public/。
原始 PNG 保留在 docs/ 不动（设计源，git 不入库）。

注意：thumb[i] 与 bg[i] 按索引配对（同一序号 = 同一座岛的 L1 缩略图与 L2 背景）。
因无法逐张肉眼核对风格，配对顺序为占位，待视觉核对后可在 islandArt.ts 微调。
"""
import os
import glob
from PIL import Image

ROOT = r"D:\first_harness\知识岛"
SRC_ISLANDS = os.path.join(ROOT, "docs", "112初版", "112初版")
SRC_BG = os.path.join(ROOT, "docs", "113背景", "113背景")
DST_ISLANDS = os.path.join(ROOT, "public", "islands")
DST_BG = os.path.join(ROOT, "public", "bg")

os.makedirs(DST_ISLANDS, exist_ok=True)
os.makedirs(DST_BG, exist_ok=True)

# 19 张岛屿插画（排除 7.png 横幅 / 10-x 精灵模板 / 怪物图 / 精灵拼接图）
ISLAND_PATTERNS = [
    "1-1.png", "1-2.png",
    "2-1.png", "2-2.png", "2-3.png", "2-4.png", "2-5.png",
    "3-1.png", "3-2.png", "3-3*.png", "3-4.png", "3-5.png",
    "4- (1).png", "4- (2).png", "4- (3).png", "4- (4).png",
    "6.png", "8.png", "9.png",
]

def find_first(pattern):
    hits = sorted(glob.glob(os.path.join(SRC_ISLANDS, pattern)))
    if not hits:
        raise FileNotFoundError(f"未找到岛屿插画: {pattern}")
    return hits[0]

def compress(src, dst, max_side):
    with Image.open(src) as im:
        im = im.convert("RGBA")
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=82, method=4)

# ---- 岛屿插画 ----
island_files = [find_first(p) for p in ISLAND_PATTERNS]
print(f"[islands] 找到 {len(island_files)} 张岛屿插画")
for i, src in enumerate(island_files, start=1):
    dst = os.path.join(DST_ISLANDS, f"island_{i:02d}.webp")
    compress(src, dst, max_side=480)
    print(f"  island_{i:02d}.webp <- {os.path.basename(src)}")

# ---- 背景图（按文件名排序，19 张）----
bg_files = sorted(glob.glob(os.path.join(SRC_BG, "A_2_5D*.png")))
print(f"[bg] 找到 {len(bg_files)} 张背景图")
for i, src in enumerate(bg_files, start=1):
    dst = os.path.join(DST_BG, f"bg_{i:02d}.webp")
    compress(src, dst, max_side=1280)
    print(f"  bg_{i:02d}.webp <- {os.path.basename(src)}")

# ---- 精灵模板 10-1~10-7（每个含 4 形态，需按 bbox 裁成 4 张；本轮先整图保留，标注待抠图）----
print("[spirits] 10-x 模板原图位置（待裁成 4 形态后替换 public/sprites 的蓝/紫 2 套）:")
for p in sorted(glob.glob(os.path.join(SRC_ISLANDS, "10-*.png"))):
    print("  ", os.path.basename(p))

print("DONE")
