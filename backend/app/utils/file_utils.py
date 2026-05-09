import logging
import os
import re
import unicodedata
from typing import Optional

from app.core.config import ALLOWED_EXTENSIONS, FRAMES_DIR, MAX_UPLOAD_MB, UPLOAD_DIR

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Filename safety
# ─────────────────────────────────────────────────────────────────────────────

def sanitize_filename(filename: str) -> str:
    """
    Return a filesystem-safe version of *filename*.

      1. Normalise unicode → ASCII.
      2. Strip every character that is not alphanumeric, dot, dash, or underscore.
      3. Collapse consecutive dots (path-traversal guard).
      4. Strip leading dots and whitespace.
      5. Fall back to 'upload' when the result would be empty.
    """
    value: str = unicodedata.normalize("NFKD", filename)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w.\-]", "_", value)
    value = re.sub(r"\.{2,}", ".", value)
    value = value.lstrip(". ").strip()
    return value or "upload"


# ─────────────────────────────────────────────────────────────────────────────
# Extension validation
# ─────────────────────────────────────────────────────────────────────────────

def is_allowed_extension(filename: str) -> bool:
    """Return True when *filename* carries a permitted video extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ─────────────────────────────────────────────────────────────────────────────
# Directory helpers
# ─────────────────────────────────────────────────────────────────────────────

def ensure_upload_dir() -> None:
    """Create UPLOAD_DIR (and any missing parents) if it does not yet exist."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    log.debug("Upload directory ready: %s", os.path.abspath(UPLOAD_DIR))


def ensure_frames_dir() -> None:
    """Create FRAMES_DIR (and any missing parents) if it does not yet exist."""
    os.makedirs(FRAMES_DIR, exist_ok=True)
    log.debug("Frames directory ready: %s", os.path.abspath(FRAMES_DIR))


# ─────────────────────────────────────────────────────────────────────────────
# File-size guard
# ─────────────────────────────────────────────────────────────────────────────

def within_size_limit(size_bytes: Optional[int]) -> bool:
    """
    Return True when *size_bytes* is within MAX_UPLOAD_MB.
    A None size (unknown at upload time) is treated as acceptable.
    """
    if size_bytes is None:
        return True
    limit = MAX_UPLOAD_MB * 1024 * 1024
    return size_bytes <= limit