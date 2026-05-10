from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import (
    API_DESCRIPTION,
    API_TITLE,
    API_VERSION,
    BASE_DIR,  
    LOG_DATE_FORMAT,
    LOG_FORMAT,
    LOG_LEVEL,
)
from app.routes.prediction_routes import router as prediction_router
from app.routes.system_routes import router as system_router
from app.services.deepfake_service import load_model, warmup_model
from app.utils.file_utils import ensure_frames_dir, ensure_upload_dir


def _configure_logging() -> None:
    """
    Configure the root logger before the application starts accepting
    requests.  All module-level ``log = logging.getLogger(__name__)``
    loggers inherit this configuration automatically.
    """
    logging.basicConfig(
        level=LOG_LEVEL,
        format=LOG_FORMAT,
        datefmt=LOG_DATE_FORMAT,
    )
    # Suppress chatty third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)


log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifecycle hook.

    Startup sequence:
      1. Configure logging.
      2. Ensure storage directories exist.
      3. Load the deepfake detection model.
      4. Run the warm-up inference pass.

    Shutdown:
      Cleanup logic can be added after the yield if needed.
    """
    _configure_logging()

    log.info("=" * 60)
    log.info("  %s  v%s", API_TITLE, API_VERSION)
    log.info("=" * 60)

    ensure_upload_dir()
    ensure_frames_dir()

    load_model()
    warmup_model()

    log.info("Application startup complete. Ready to accept requests.")
    yield

    log.info("Application shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# Application instance
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=lifespan,
    docs_url=None,      # disables /docs  — prevents Python 3.9 + Pydantic v2 crash
    redoc_url=None,     # disables /redoc
    openapi_url=None,   # disables OpenAPI schema generation entirely
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — allow the React frontend (localhost:3000) to call this API
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Static files + routers
# ─────────────────────────────────────────────────────────────────────────────

#app.mount("/static", StaticFiles(directory="static"), name="static")


app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static"
)
app.include_router(prediction_router)
app.include_router(system_router)