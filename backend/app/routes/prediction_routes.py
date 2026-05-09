from __future__ import annotations

import glob
import logging
import os
import shutil
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse

from app.core.config import FRAMES_DIR, UPLOAD_DIR
from app.models.response_models import PredictionResponse
from app.services import deepfake_service as svc
from app.utils.file_utils import (
    ensure_upload_dir,
    is_allowed_extension,
    sanitize_filename,
    within_size_limit,
)

log = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])

ensure_upload_dir()


# ─────────────────────────────────────────────────────────────────────────────
# GET /
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
async def index() -> JSONResponse:
    """Basic status endpoint. The React frontend lives at localhost:3000."""
    return JSONResponse(content={
        "status": "ok",
        "model_status": svc.MODEL_STATUS,
        "message": "DeepFake Detection API is running. Use the React frontend at http://localhost:3000",
    })


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload  — primary endpoint used by the React frontend
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=PredictionResponse)
async def upload_and_predict(
    file: UploadFile = File(...),
) -> JSONResponse:
    """
    Accept a video upload and return a detailed JSON prediction.

    This is the primary endpoint used by the React frontend via Axios.
    It powers the upload progress bar and the multi-stage processing UI.

    Validation order:
      1. Service health check
      2. File presence
      3. Extension check
      4. File size limit
      5. Persist to disk
      6. Model availability guard
      7. Inference
      8. Collect saved debug frame filenames
    """
    log.info("Received upload request — filename: %s", file.filename)

    # 1. Service health
    if svc.LOADING_ERROR:
        log.error("Upload rejected — service error: %s", svc.LOADING_ERROR)
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {svc.LOADING_ERROR}",
        )

    # 2. File presence
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    # 3. Extension check
    if not is_allowed_extension(file.filename):
        log.warning("Rejected file with unsupported extension: %s", file.filename)
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload an MP4, MOV, or AVI video.",
        )

    # 4. Size limit (content-length header may not always be present)
    if not within_size_limit(file.size):
        raise HTTPException(
            status_code=413,
            detail="File exceeds the maximum allowed size.",
        )

    # 5. Persist to disk
    safe_name: str = sanitize_filename(file.filename)
    dest: str = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
        log.info("Video saved to: %s", dest)
    except OSError as exc:
        log.error("File save failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"File save failed: {exc}")

    # 6. Model guard
    if svc.MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please try again shortly.",
        )

    # 7. Inference
    try:
        result = svc.predict(dest)
    except RuntimeError as exc:
        log.error("Inference failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        log.exception("Unexpected error during inference.")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during analysis: {exc}",
        )

    # 8. Collect saved debug frame filenames so the React gallery can display them
    video_stem: str = os.path.splitext(safe_name)[0]
    frame_pattern: str = os.path.join(FRAMES_DIR, f"{video_stem}_slot*.jpg")
    frame_files: List[str] = sorted(glob.glob(frame_pattern))
    frame_names: List[str] = [os.path.basename(f) for f in frame_files]
    log.info("Found %d debug frames for gallery.", len(frame_names))

    return JSONResponse(
        content={
            "filename": safe_name,
            "label": result["label"],
            "confidence": result["confidence"],
            "real_probability": result["real_probability"],
            "fake_probability": result["fake_probability"],
            "frames_analyzed": result["frames_analyzed"],
            "processing_time_seconds": result["processing_time_seconds"],
            "prediction": result["prediction"],
            "frames": frame_names,   # filenames served at /static/frames/{name}
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /display_video/{filename}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/display_video/{filename}")
async def display_video(filename: str) -> RedirectResponse:
    """Redirect to the static video URL for in-page playback."""
    safe_name: str = sanitize_filename(filename)
    log.debug("Video display redirect: %s", safe_name)
    return RedirectResponse(url=f"/static/uploads/{safe_name}")