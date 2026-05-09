from __future__ import annotations
from typing import Any, Dict, Optional
from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────────────────────
# Prediction
# ─────────────────────────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    """Full result returned after a video is analysed."""

    filename: Optional[str] = None
    label: str                              # "REAL" | "DEEPFAKE"
    confidence: float                       # 0.0 – 100.0  (percentage)
    real_probability: float                 # raw softmax score  0–1
    fake_probability: float                 # raw softmax score  0–1
    frames_analyzed: int                    # exactly SEQUENCE_LENGTH
    processing_time_seconds: float          # wall-clock seconds for inference
    prediction: str                         # human-readable summary


# ─────────────────────────────────────────────────────────────────────────────
# System
# ─────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Detailed liveness + readiness probe."""

    alive: bool
    model_loaded: bool
    model_status: str
    model_path: str
    device: str
    upload_dir_exists: bool
    frames_dir_exists: bool
    error: Optional[str] = None


class StatusResponse(BaseModel):
    """Operational model + environment status."""

    model_status: str
    device: str
    sequence_length: int
    image_size: int
    save_debug_frames: bool
    warmup_enabled: bool
    error: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None