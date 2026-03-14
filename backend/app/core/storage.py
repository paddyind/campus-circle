"""
Local filesystem storage for event resources (documents, media, agreements). Tenant-scoped, event-scoped.
Path: {base}/{tenant_slug}/events/{event_id}/{category}/{uuid}_{filename}
Folder/category organization controls access (public, participants, private).
Future: pluggable backends (S3, MinIO) via STORAGE_BASE_PATH or provider config.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from app.core.config import STORAGE_BASE_PATH


def _get_base_path() -> Path:
    """Resolve storage base path. Default: project_root/storage."""
    if STORAGE_BASE_PATH:
        return Path(STORAGE_BASE_PATH).resolve()
    # Default: backend/../storage (project root)
    project_root = Path(__file__).resolve().parent.parent.parent
    return (project_root / "storage").resolve()


def ensure_event_dir(tenant_slug: str, event_id: str, category: str) -> Path:
    """Create and return directory for tenant/event/category."""
    base = _get_base_path()
    dir_path = base / tenant_slug / "events" / event_id / category
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def save_resource(
    tenant_slug: str,
    event_id: str,
    category: str,
    filename: str,
    content: bytes,
) -> str:
    """
    Save file to storage. Returns relative storage_path for DB.
    Uses unique prefix to avoid filename collisions.
    """
    dir_path = ensure_event_dir(tenant_slug, event_id, category)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
    if not safe_name:
        safe_name = "file"
    unique_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"
    file_path = dir_path / unique_name
    file_path.write_bytes(content)
    # Return path relative to base for portability
    base = _get_base_path()
    return str(file_path.relative_to(base))


def get_resource_path(storage_path: str) -> Optional[Path]:
    """Resolve full filesystem path from stored storage_path."""
    base = _get_base_path()
    full = base / storage_path
    if not full.exists() or not str(full.resolve()).startswith(str(base.resolve())):
        return None
    return full


def delete_resource(storage_path: str) -> bool:
    """Delete file from storage. Returns True if deleted or not found."""
    full = get_resource_path(storage_path)
    if not full:
        return True
    try:
        full.unlink(missing_ok=True)
        return True
    except OSError:
        return False


def list_event_files(tenant_slug: str, event_id: str) -> list:
    """List all stored files for an event (for cleanup/archive)."""
    base = _get_base_path()
    event_dir = base / tenant_slug / "events" / event_id
    if not event_dir.exists():
        return []
    files = []
    for root, _, names in os.walk(event_dir):
        for name in names:
            rel = Path(root) / name
            try:
                rel_path = rel.relative_to(base)
                files.append(str(rel_path))
            except ValueError:
                pass
    return files


def archive_event_storage(tenant_slug: str, event_id: str, archive_dir: Optional[str] = None) -> Optional[str]:
    """
    Move all event files to archive folder. Returns archive path or None.
    For future: zip and move to cold storage.
    """
    base = _get_base_path()
    event_dir = base / tenant_slug / "events" / event_id
    if not event_dir.exists():
        return None
    archive_base = Path(archive_dir) if archive_dir else (base / "archive")
    dest = archive_base / tenant_slug / "events" / event_id
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.move(str(event_dir), str(dest))
    return str(dest)
