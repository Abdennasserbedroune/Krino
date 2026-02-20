"""Health check endpoints for the new backend app."""
from fastapi import APIRouter

router = APIRouter()


@router.get("", tags=["health"], summary="Service healthcheck")
def read_health() -> dict[str, str]:
    """Return a simple status response used by orchestrators and uptime checks."""
    return {"status": "ok"}
