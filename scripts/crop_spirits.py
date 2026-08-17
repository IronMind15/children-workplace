#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
把 UI 设计稿的 7 张精灵模板（10- (1)..10- (7).png）各裁成 4 个进化形态，
抠掉连通背景（边缘 flood fill，保留被包围的同色区域如肚皮），羽化边缘，
输出 public/sprites/s{template}_{form}.webp（template 1-7, form 1-4，共 28 张）。

用法：python scripts/crop_spirits.py
依赖：Pillow + numpy（可选 scipy 加速连通域；无则内部 BFS 兜底）
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "docs", "112初版", "112初版")
DST_DIR = os.path.join(ROOT, "public", "sprites")
os.makedirs(DST_DIR, exist_ok=True)

# 背景判定阈值（RGB 三通道差之和）；调大更激进去背景
BG_TOL = 48
PAD = 10          # 裁剪留白
FEATHER = 1.6     # 边缘羽化 sigma(px)

try:
    from scipy import ndimage
    HAVE_SCIPY = True
except Exception:
    HAVE_SCIPY = False


def external_bg_mask(near_bg: np.ndarray) -> np.ndarray:
    """返回与边界连通的背景区域（要被抠掉的部分）。"""
    if HAVE_SCIPY:
        labels, n = ndimage.label(near_bg)
        border = np.zeros_like(near_bg)
        border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
        touch = np.unique(labels[border & near_bg])
        return np.isin(labels, touch)
    # 无 scipy：多源 BFS
    H, W = near_bg.shape
    remove = np.zeros_like(near_bg)
    stack = []
    for x in range(W):
        for y in (0, H - 1):
            if near_bg[y, x]:
                stack.append((y, x))
    for x in (0, W - 1):
        for y in range(H):
            if near_bg[y, x] and not remove[y, x]:
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        if remove[y, x]:
            continue
        remove[y, x] = True
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and near_bg[ny, nx] and not remove[ny, nx]:
                stack.append((ny, nx))
    return remove


def crop_template(idx: int):
    src = os.path.join(SRC_DIR, f"10- ({idx}).png")
    im = Image.open(src).convert("RGB")
    arr = np.asarray(im).astype(int)
    H, W = arr.shape[:2]
    # 背景色：四角采样均值
    bg = np.array([arr[2, 2], arr[2, -3], arr[-3, 2], arr[-3, -3]]).mean(axis=0)
    diff = np.abs(arr - bg).sum(axis=2)
    near_bg = diff < BG_TOL
    remove = external_bg_mask(near_bg)

    # alpha：非背景区域不透明，羽化
    alpha = (~remove).astype(np.float32) * 255.0
    if HAVE_SCIPY:
        from scipy import ndimage
        alpha = ndimage.gaussian_filter(alpha, FEATHER)
    else:
        tmp = Image.fromarray(alpha.astype(np.uint8))
        tmp = tmp.filter(ImageFilter.GaussianBlur(FEATHER))
        alpha = np.asarray(tmp).astype(np.float32)
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)

    rgba = np.dstack([arr.astype(np.uint8), alpha])  # H,W,4

    # 4 等分
    quarters = [int(round(W * k / 4)) for k in range(5)]
    results = []
    for k in range(4):
        x0, x1 = quarters[k], quarters[k + 1]
        # 搜索窗口：本分条 ±30px（缝隙是背景，不会误抓相邻形态）
        sx0 = max(0, x0 - 30)
        sx1 = min(W, x1 + 30)
        win = (~remove)[:, sx0:sx1]
        ys, xs = np.where(win)
        if len(ys) == 0:
            print(f"  ! template {idx} form {k+1} 空，跳过")
            continue
        y0, y1 = ys.min(), ys.max()
        x0c, x1c = xs.min(), xs.max()
        top = max(0, y0 - PAD)
        bot = min(H, y1 + PAD)
        left = max(0, x0c - PAD)
        right = min(W, x1c + PAD)
        crop = rgba[top:bot, left:right]
        out = Image.fromarray(crop, "RGBA")
        out = out.resize((out.width, out.height), Image.LANCZOS)
        # 压缩为 webp
        fname = f"s{idx}_{k+1}.webp"
        out.save(os.path.join(DST_DIR, fname), "WEBP", quality=90, method=4)
        nt = int((crop[:, :, 3] > 10).sum())
        results.append((fname, crop.shape[1], crop.shape[0], nt))
    return results


if __name__ == "__main__":
    print(f"scipy={'YES' if HAVE_SCIPY else 'NO'}")
    for i in range(1, 8):
        res = crop_template(i)
        print(f"[template {i}] -> " + ", ".join(f"{n}({w}x{h},{px}px)" for n, w, h, px in res))
    print("done")
