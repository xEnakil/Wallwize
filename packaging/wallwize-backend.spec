# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
import sys

from PyInstaller.utils.hooks import collect_data_files


PROJECT_ROOT = Path(SPECPATH).parent
if PROJECT_ROOT.name == "packaging":
    PROJECT_ROOT = PROJECT_ROOT.parent

datas = []
datas += collect_data_files("wallwize.classification.vision")


a = Analysis(
    [str(PROJECT_ROOT / "scripts" / "backend_entry.py")],
    pathex=[str(PROJECT_ROOT / "src")],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="wallwize-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=sys.platform.startswith("win"),
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
