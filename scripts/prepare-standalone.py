# -*- coding: utf-8 -*-
"""准备 Electron standalone 目录（在 next build 之后执行）：
Next.js output:"standalone" 产物（.next/standalone）不包含 public/ 与 .next/static，
需手动复制进去，否则桌面版图片/静态资源 404。
用法: python scripts/prepare-standalone.py
"""
import os
import shutil
import sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
standalone = os.path.join(root, ".next", "standalone")

if not os.path.exists(os.path.join(standalone, "server.js")):
    print("未找到 .next/standalone/server.js，请先执行 next build", file=sys.stderr)
    sys.exit(1)

# 确保打包不含任何玩家数据（trace 可能把项目 data/ 带入 standalone）
data_dir = os.path.join(standalone, "data")
if os.path.exists(data_dir):
    shutil.rmtree(data_dir, ignore_errors=True)
    print("已清除 standalone/data（打包不含玩家数据）")

shutil.copytree(os.path.join(root, "public"), os.path.join(standalone, "public"), dirs_exist_ok=True)
print("public -> standalone/public 完成")

shutil.copytree(
    os.path.join(root, ".next", "static"),
    os.path.join(standalone, ".next", "static"),
    dirs_exist_ok=True,
)
print(".next/static -> standalone/.next/static 完成")
print("standalone 资源准备完成")
