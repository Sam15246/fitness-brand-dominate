import os
from pathlib import Path
import shutil

# Ensure fresh SQLite test DB before collection to avoid schema mismatches
project_root = Path(__file__).resolve().parent.parent
instance_dir = project_root / 'instance'
test_db = instance_dir / 'test.db'

# Remove existing test DB and journal files if present
if test_db.exists():
    try:
        test_db.unlink()
    except Exception:
        pass

# Remove SQLite journal/wal files
for suffix in ('-shm', '-wal'):
    f = instance_dir / f'test.db{suffix}'
    if f.exists():
        try:
            f.unlink()
        except Exception:
            pass
