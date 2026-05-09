import logging
import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import (
    DEVICE,
    FRAMES_DIR,
    IMAGE_SIZE,
    MODEL_PATH,
    SAVE_DEBUG_FRAMES,
    SEQUENCE_LENGTH,
    UPLOAD_DIR,
    WARMUP_ENABLED,
)
from app.models.response_models import HealthResponse, StatusResponse
from app.services import deepfake_service as svc

log = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """
    Detailed liveness + readiness probe.

    Returns the state of every critical dependency:
      • model loaded flag
      • upload directory existence
      • frames directory existence
      • device in use

    Suitable for container HEALTHCHECK instructions and load-balancer probes.
    """
    model_loaded: bool = svc.MODEL is not None
    upload_ok: bool = os.path.isdir(UPLOAD_DIR)
    frames_ok: bool = os.path.isdir(FRAMES_DIR)

    log.debug(
        "Health check — model_loaded: %s  upload_dir: %s  frames_dir: %s",
        model_loaded, upload_ok, frames_ok,
    )

    return HealthResponse(
        alive=True,
        model_loaded=model_loaded,
        model_status=svc.MODEL_STATUS,
        model_path=MODEL_PATH,
        device=str(DEVICE),
        upload_dir_exists=upload_ok,
        frames_dir_exists=frames_ok,
        error=svc.LOADING_ERROR,
    )


@router.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    """
    Operational configuration and model status.

    Exposes runtime settings (sequence length, image size, feature flags)
    that are useful when verifying a deployment or debugging inference issues.
    """
    return StatusResponse(
        model_status=svc.MODEL_STATUS,
        device=str(DEVICE),
        sequence_length=SEQUENCE_LENGTH,
        image_size=IMAGE_SIZE,
        save_debug_frames=SAVE_DEBUG_FRAMES,
        warmup_enabled=WARMUP_ENABLED,
        error=svc.LOADING_ERROR,
        extra={
            "model_path": MODEL_PATH,
            "upload_dir": UPLOAD_DIR,
            "frames_dir": FRAMES_DIR,
        },
    )