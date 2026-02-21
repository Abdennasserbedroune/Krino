"""Health check endpoints for the new backend app."""
from fastapi import APIRouter

router = APIRouter()


@router.get("", tags=["health"], summary="Service healthcheck")
def read_health() -> dict[str, str]:
    """Return a simple status response used by orchestrators and uptime checks."""
    return {"status": "ok"}

@router.get("/db-test", tags=["health"], summary="Test DB Connection")
def test_db():
    from app.db.session import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
            cvs_count = db.execute(text("SELECT COUNT(*) FROM cvs")).scalar()
            return {"status": "ok", "users": users_count, "cvs": cvs_count}
        except Exception as e:
            return {"status": "error", "detail": str(e), "type": "query_error"}
        finally:
            db.close()
    except Exception as e:
        return {"status": "error", "detail": str(e), "type": "connection_error"}

@router.get("/routes", tags=["health"])
def get_routes(request: __import__("fastapi").Request):
    return {"routes": [{"path": route.path, "name": route.name} for route in request.app.routes]}
