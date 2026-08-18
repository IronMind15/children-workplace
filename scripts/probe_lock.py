"""CreateFileW 级锁探针：区分「文件被其他进程独占」vs「文件系统/权限问题」。
用法: python probe_lock.py <path1> [path2 ...]
"""
import ctypes
import sys
from ctypes import wintypes

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x1
FILE_SHARE_WRITE = 0x2
FILE_SHARE_DELETE = 0x4
OPEN_EXISTING = 3
CREATE_NEW = 1
INVALID_HANDLE = ctypes.c_void_p(-1).value

kernel32.CreateFileW.restype = wintypes.HANDLE
kernel32.CreateFileW.argtypes = [
    wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
    wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE,
]


def try_open(label, path, share, gen, disposition=OPEN_EXISTING):
    h = kernel32.CreateFileW(path, gen, share, None, disposition, 0, None)
    if h == INVALID_HANDLE:
        err = ctypes.get_last_error()
        msg = ctypes.FormatError(err).strip()
        return f"{label}: FAIL  errno={err} ({msg})"
    kernel32.CloseHandle(h)
    return f"{label}: OK"


def probe(path):
    print(f"=== {path} ===")
    # 1) 独占读写：若被别的进程以不允许共享的方式打开，这里必失败
    print(try_open("独占读写(share=0)          ", path, 0, GENERIC_READ | GENERIC_WRITE))
    # 2) 全共享读写：SQLite 打开数据库的标准姿势
    print(try_open("全共享读写                  ", path,
                   FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                   GENERIC_READ | GENERIC_WRITE))
    # 3) 只读请求：readonly 报错时 SQLite 尝试的就是这类
    print(try_open("共享只读                    ", path,
                   FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                   GENERIC_READ))


for p in sys.argv[1:]:
    probe(p)
    print()

# 4) 「新文件延迟锁定」对照：复制一个全新文件，立即测试
import shutil
import tempfile
import os

src = sys.argv[1]
tmp = os.path.join(os.path.dirname(src), "_probe_copy_" + os.path.basename(src))
try:
    shutil.copy2(src, tmp)
    print(f"=== 新副本 {os.path.basename(tmp)}（复制后立即测）===")
    print(try_open("新副本-独占读写             ", tmp, 0, GENERIC_READ | GENERIC_WRITE))
    print(try_open("新副本-全共享读写           ", tmp,
                   FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                   GENERIC_READ | GENERIC_WRITE))
finally:
    try:
        os.remove(tmp)
    except OSError:
        pass
