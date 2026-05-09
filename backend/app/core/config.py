import logging
from typing import FrozenSet

import torch

# ── Upload settings ───────────────────────────────────────────────────────────
UPLOAD_DIR: str = "static/uploads"
FRAMES_DIR: str = "static/frames"          # debug frame snapshots land here
ALLOWED_EXTENSIONS: FrozenSet[str] = frozenset({"mp4", "mov", "avi"})
MAX_UPLOAD_MB: int = 500                   # hard limit on incoming file size

# ── Model checkpoint ──────────────────────────────────────────────────────────
MODEL_PATH: str = "Saved Models/models/Pytorch/model_90.pt"

# ── Model architecture constants ──────────────────────────────────────────────
SEQUENCE_LENGTH: int = 20       # frames sampled per video
IMAGE_SIZE: int = 224           # spatial resolution fed to the backbone
FEATURE_DIM: int = 2048         # ResNeXt-50 output width
LSTM_HIDDEN: int = 2048         # must match the saved checkpoint
NUM_CLASSES: int = 2            # index 0 → REAL, index 1 → DEEPFAKE

# ── Compute device ────────────────────────────────────────────────────────────
DEVICE: torch.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Feature flags ─────────────────────────────────────────────────────────────
SAVE_DEBUG_FRAMES: bool = True             # write sampled frames to FRAMES_DIR
WARMUP_ENABLED: bool = True                # run dummy inference after model load

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL: int = logging.DEBUG
LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"

# ── API metadata ──────────────────────────────────────────────────────────────
API_TITLE: str = "DeepFake Video Detector"
API_VERSION: str = "2.0.0"
API_DESCRIPTION: str = (
    "Professional deepfake detection API powered by ResNeXt-50 + LSTM. "
    "Upload a video to receive a detailed REAL / DEEPFAKE analysis."
)