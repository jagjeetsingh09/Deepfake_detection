"""
deepfake_service.py
===================
Complete AI inference pipeline for deepfake video detection.

Public API
----------
  load_model()               – load checkpoint once at startup
  warmup_model()             – run dummy inference to pre-heat the GPU/CPU path
  extract_frames_temporal()  – research-grade temporal frame sampler
  predict()                  – end-to-end inference with full result dict
"""

import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import gdown
from app.core.config import (
    DEVICE,
    FEATURE_DIM,
    FRAMES_DIR,
    IMAGE_SIZE,
    LSTM_HIDDEN,
    MODEL_PATH,
    NUM_CLASSES,
    SAVE_DEBUG_FRAMES,
    SEQUENCE_LENGTH,
    WARMUP_ENABLED,
)

log = logging.getLogger(__name__)

# ── Module-level model state ──────────────────────────────────────────────────
MODEL: Optional[nn.Module] = None
MODEL_STATUS: str = "Not Loaded"
LOADING_ERROR: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Model Architecture
# ─────────────────────────────────────────────────────────────────────────────

class VideoDetectionModel(nn.Module):
    """
    ResNeXt-50 spatial feature extractor + single-layer LSTM temporal
    aggregator + linear classification head.

    Input:  (batch, T, C, H, W)  float32 tensor
    Output: (batch, NUM_CLASSES) logits
    """

    def __init__(
        self,
        num_classes: int = NUM_CLASSES,
        lstm_hidden: int = LSTM_HIDDEN,
    ) -> None:
        super().__init__()

        # ── Spatial backbone ─────────────────────────────────────────────
        try:
            self.backbone = models.resnext50_32x4d(
                weights=models.ResNeXt50_32X4D_Weights.IMAGENET1K_V1
            )
            log.debug("Backbone: loaded ImageNet-pretrained ResNeXt-50 weights.")
        except Exception as exc:
            log.warning("Pretrained backbone weights unavailable: %s", exc)
            self.backbone = models.resnext50_32x4d(weights=None)

        # Strip classification head — expose 2048-d spatial feature vector
        self.backbone.fc = nn.Identity()

        # ── Temporal encoder ─────────────────────────────────────────────
        self.lstm = nn.LSTM(
            input_size=FEATURE_DIM,
            hidden_size=lstm_hidden,
            batch_first=True,
            num_layers=1,
        )

        # ── Classification head ──────────────────────────────────────────
        self.classifier = nn.Linear(lstm_hidden, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch, T, C, H, W = x.shape
        x = x.view(batch * T, C, H, W)
        features = self.backbone(x)                    # (B*T, FEATURE_DIM)
        features = features.view(batch, T, FEATURE_DIM)
        _, (h_n, _) = self.lstm(features)              # h_n: (1, B, hidden)
        return self.classifier(h_n[-1])                # (B, num_classes)


# ─────────────────────────────────────────────────────────────────────────────
# Startup: Load
# ─────────────────────────────────────────────────────────────────────────────
def download_model_if_needed() -> None:
    """Download model from Google Drive if not present locally."""
    if not os.path.exists(MODEL_PATH):
        log.info("Model file not found at '%s'. Downloading from Google Drive...", MODEL_PATH)
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        gdown.download(
            id="1dpZQ4h2c8pUkJrP7Dz-uXTiedx2klM4W",
            output=MODEL_PATH,
            quiet=False,
        )
        log.info("Model downloaded successfully to '%s'.", MODEL_PATH)
    else:
        log.info("Model file found at '%s'. Skipping download.", MODEL_PATH)



def load_model() -> None:
    """
    Instantiate VideoDetectionModel, load the saved checkpoint, move it to
    DEVICE, and switch to eval mode.

    Updates module globals MODEL, MODEL_STATUS, LOADING_ERROR.
    Call this exactly once from the FastAPI lifespan hook.
    """
    global MODEL, MODEL_STATUS, LOADING_ERROR

    log.info("Loading deepfake detection model from '%s' ...", MODEL_PATH)
    download_model_if_needed()
    try:
        model = VideoDetectionModel(num_classes=NUM_CLASSES)
        state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
        model.load_state_dict(state_dict, strict=False)
        model.to(DEVICE)
        model.eval()

        MODEL = model
        MODEL_STATUS = f"Ready (on {DEVICE.type.upper()})"
        log.info("Model loaded successfully. Device: %s", DEVICE.type.upper())

    except Exception as exc:
        LOADING_ERROR = f"Model load failed: {exc}"
        MODEL = None
        log.error(LOADING_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# Startup: Warm-up
# ─────────────────────────────────────────────────────────────────────────────

def warmup_model() -> None:
    """
    Run a single dummy forward pass to pre-heat the inference path.

    Benefits:
      • JIT compilation (if applicable) happens at startup, not on the first
        real request.
      • GPU memory is pre-allocated.
      • First-request latency is dramatically reduced.

    A (1, SEQUENCE_LENGTH, 3, IMAGE_SIZE, IMAGE_SIZE) zero tensor is used as
    the dummy input — identical in shape to a real video batch.
    """
    if not WARMUP_ENABLED or MODEL is None:
        log.debug("Model warm-up skipped (enabled=%s, loaded=%s).",
                  WARMUP_ENABLED, MODEL is not None)
        return

    log.info("Running model warm-up pass ...")
    t0: float = time.perf_counter()

    dummy: torch.Tensor = torch.zeros(
        1, SEQUENCE_LENGTH, 3, IMAGE_SIZE, IMAGE_SIZE,
        dtype=torch.float32,
        device=DEVICE,
    )

    with torch.no_grad():
        MODEL(dummy)

    elapsed: float = time.perf_counter() - t0
    log.info("Warm-up complete in %.3f s.", elapsed)


# ─────────────────────────────────────────────────────────────────────────────
# Temporal Frame Sampling  (research-grade)
# ─────────────────────────────────────────────────────────────────────────────

def _compute_segment_indices(total_frames: int, sequence_length: int) -> List[int]:
    """
    Divide the video timeline into *sequence_length* equal temporal segments
    and return the index of the representative (centre) frame from each segment.

    This mirrors the strategy used in FaceForensics++ and DFDC evaluation
    pipelines: uniform temporal coverage ensures the model sees the full
    temporal arc of a video rather than clustering frames at the start.

    Parameters
    ----------
    total_frames : int
        Total number of decoded frames reported by the video container.
    sequence_length : int
        Desired number of output frames (== SEQUENCE_LENGTH).

    Returns
    -------
    List[int] of exactly *sequence_length* frame indices, all in
    [0, total_frames - 1].

    Algorithm
    ---------
    Case A — sufficient frames  (total_frames >= sequence_length):

        segment_size = total_frames / sequence_length
        index_i      = floor(i * segment_size + segment_size / 2)

        Example: 300 frames, sequence_length = 20
          segment_size = 15.0
          indices = [7, 22, 37, 52, ..., 292]   (centre of every 15-frame block)

    Case B — short video  (total_frames < sequence_length):

        Each available frame is proportionally repeated to reach the target
        length.  No black-frame padding is used — the model always receives
        real content.

        Example: 8 frames, sequence_length = 20
          scale = 20 / 8 = 2.5
          index_i = floor(i / scale)  → each frame repeats ~2-3 times
    """
    if total_frames <= 0:
        log.warning("Video reports 0 frames; returning zero-index sequence.")
        return [0] * sequence_length

    if total_frames >= sequence_length:
        seg: float = total_frames / sequence_length
        return [
            min(int(i * seg + seg / 2.0), total_frames - 1)
            for i in range(sequence_length)
        ]
    else:
        # Short video: proportionally tile available frames
        scale: float = sequence_length / total_frames
        return [
            min(int(i / scale), total_frames - 1)
            for i in range(sequence_length)
        ]


def extract_frames_temporal(
    video_path: str,
    save_debug: bool = SAVE_DEBUG_FRAMES,
) -> Tuple[Optional[List[np.ndarray]], int]:
    """
    Extract exactly SEQUENCE_LENGTH frames from *video_path* using
    research-grade temporal segment sampling.

    Each frame is:
      1. Sought directly via ``cap.set(CAP_PROP_POS_FRAMES, idx)``
         — O(1) seek, no sequential decode of skipped frames.
      2. Converted BGR → RGB.
      3. Resized to IMAGE_SIZE × IMAGE_SIZE.
      4. Normalised to [0, 1] float32.

    If *save_debug* is True the raw (non-normalised) resized frames are
    written to FRAMES_DIR as JPEG files so the sampling can be inspected
    visually without running the full pipeline.

    Parameters
    ----------
    video_path : str
        Absolute or relative path to the uploaded video file.
    save_debug : bool
        When True, save sampled frames to ``static/frames/``.

    Returns
    -------
    (frames, total_frames) where:
      frames       – list of SEQUENCE_LENGTH float32 ndarrays (H, W, C),
                     or None if the video cannot be opened.
      total_frames – integer frame count reported by the container
                     (0 when the video failed to open).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        log.error("Cannot open video file: %s", video_path)
        return None, 0

    try:
        total_frames: int = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps: float = cap.get(cv2.CAP_PROP_FPS) or 0.0
        log.info(
            "Video opened — total frames: %d  |  FPS: %.2f  |  path: %s",
            total_frames, fps, video_path,
        )

        indices: List[int] = _compute_segment_indices(total_frames, SEQUENCE_LENGTH)
        log.debug("Segment sample indices: %s", indices)

        frames: List[np.ndarray] = []
        video_stem: str = os.path.splitext(os.path.basename(video_path))[0]

        for slot, idx in enumerate(indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, float(idx))
            ok, raw_frame = cap.read()

            if ok:
                rgb = cv2.cvtColor(raw_frame, cv2.COLOR_BGR2RGB)
                resized = cv2.resize(rgb, (IMAGE_SIZE, IMAGE_SIZE))

                # Optional: persist raw frame for visual debugging
                if save_debug:
                    _save_debug_frame(resized, video_stem, slot, idx)

                frames.append(resized.astype(np.float32) / 255.0)

            else:
                log.warning(
                    "Frame seek failed at index %d (slot %d); "
                    "reusing previous frame.", idx, slot,
                )
                fallback: np.ndarray = (
                    frames[-1].copy() if frames
                    else np.zeros((IMAGE_SIZE, IMAGE_SIZE, 3), dtype=np.float32)
                )
                frames.append(fallback)

        log.info("Frame extraction complete — %d frames extracted.", len(frames))

    finally:
        cap.release()

    return frames, total_frames


def _save_debug_frame(
    frame_rgb: np.ndarray,
    video_stem: str,
    slot: int,
    original_idx: int,
) -> None:
    """Write a single debug frame to FRAMES_DIR as JPEG."""
    try:
        os.makedirs(FRAMES_DIR, exist_ok=True)
        bgr: np.ndarray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        name: str = f"{video_stem}_slot{slot:03d}_frame{original_idx:06d}.jpg"
        dest: str = os.path.join(FRAMES_DIR, name)
        cv2.imwrite(dest, bgr)
        log.debug("Debug frame saved: %s", dest)
    except Exception as exc:
        log.warning("Could not save debug frame (slot %d): %s", slot, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Tensor Builder
# ─────────────────────────────────────────────────────────────────────────────

def _frames_to_tensor(frames: List[np.ndarray]) -> torch.Tensor:
    """
    Convert a list of (H, W, C) float32 ndarrays into a
    (1, T, C, H, W) tensor on DEVICE.
    """
    arr: np.ndarray = np.stack(frames)                  # (T, H, W, C)
    tensor: torch.Tensor = (
        torch.from_numpy(arr)
        .permute(0, 3, 1, 2)                            # (T, C, H, W)
        .unsqueeze(0)                                   # (1, T, C, H, W)
        .to(DEVICE)
    )
    log.debug(
        "Input tensor shape: %s  dtype: %s  device: %s",
        tuple(tensor.shape), tensor.dtype, tensor.device,
    )
    return tensor


# ─────────────────────────────────────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────────────────────────────────────

def predict(video_path: str) -> Dict[str, Any]:
    """
    Run the full inference pipeline on *video_path*.

    Pipeline
    --------
    1. Guard — model loaded?
    2. Temporal frame extraction (extract_frames_temporal)
    3. Tensor construction (_frames_to_tensor)
    4. Forward pass through VideoDetectionModel
    5. Softmax → probabilities → label + confidence

    Returns
    -------
    dict with keys:
        label                  – "REAL" | "DEEPFAKE"
        confidence             – float percentage (0–100)
        real_probability       – softmax score for REAL  (0–1)
        fake_probability       – softmax score for DEEPFAKE (0–1)
        frames_analyzed        – integer (== SEQUENCE_LENGTH)
        processing_time_seconds – wall-clock seconds for the full pipeline
        prediction             – human-readable summary string

    Raises
    ------
    RuntimeError  when the model is unavailable or preprocessing fails.
    """
    if MODEL is None:
        raise RuntimeError("Model is not loaded. Cannot run inference.")

    log.info("Starting inference pipeline for: %s", video_path)
    pipeline_start: float = time.perf_counter()

    # ── Frame extraction ─────────────────────────────────────────────────
    log.info("Step 1/3 — Extracting frames (temporal sampling) ...")
    frames, total_frames = extract_frames_temporal(video_path)

    if frames is None:
        raise RuntimeError(f"Frame extraction failed for: {video_path}")

    log.info(
        "Step 1/3 — Done. Extracted %d frames from %d total.",
        len(frames), total_frames,
    )

    # ── Tensor construction ──────────────────────────────────────────────
    log.info("Step 2/3 — Building input tensor ...")
    tensor: torch.Tensor = _frames_to_tensor(frames)
    log.info("Step 2/3 — Done. Tensor ready.")

    # ── Model forward pass ───────────────────────────────────────────────
    log.info("Step 3/3 — Running model forward pass on %s ...", DEVICE.type.upper())
    infer_start: float = time.perf_counter()

    with torch.no_grad():
        logits: torch.Tensor = MODEL(tensor)
        probs: np.ndarray = F.softmax(logits, dim=1).cpu().numpy()[0]

    infer_elapsed: float = time.perf_counter() - infer_start
    log.info("Step 3/3 — Forward pass complete in %.3f s.", infer_elapsed)

    # ── Result assembly ──────────────────────────────────────────────────
    real_prob: float = float(probs[0])
    fake_prob: float = float(probs[1])
    label: str = "DEEPFAKE" if fake_prob > real_prob else "REAL"
    confidence: float = max(real_prob, fake_prob) * 100.0
    # if label == "DEEPFAKE":
    #   confidence = min(70 + confidence * 0.5, 99)
   
    # confidence = min(60 + confidence * 0.6, 99)
    processing_time: float = round(time.perf_counter() - pipeline_start, 3)

    log.info(
        "Prediction: %s  |  Confidence: %.2f%%  |  "
        "Real: %.4f  Fake: %.4f  |  Total time: %.3f s",
        label, confidence, real_prob, fake_prob, processing_time,
    )

    return {
        "label": label,
        "confidence": round(confidence, 2),
        "real_probability": round(real_prob, 4),
        "fake_probability": round(fake_prob, 4),
        "frames_analyzed": len(frames),
        "processing_time_seconds": processing_time,
        "prediction": (
            f"Prediction: {label} — "
            f"{confidence:.2f}% confidence over {len(frames)} frames "
            f"in {processing_time:.2f}s"
        ),
    }