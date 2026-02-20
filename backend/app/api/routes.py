"""Top-level API router wiring health and versioned routes."""
from fastapi import APIRouter

from app.api import health
from app.api.v1 import router as v1_router

api_router = APIRouter()

# Health endpoints (unversioned)
api_router.include_router(health.router, prefix="/health")

# Versioned API
api_router.include_router(v1_router)
