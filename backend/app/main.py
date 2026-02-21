"""Application entrypoint for the new Python backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings
from app.db.session import init_db


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    app = FastAPI(title=settings.PROJECT_NAME)

    # CORS configuration to allow the frontend to call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/db-test", tags=["meta"])
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

    # Include routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Startup event: ensure DB tables exist
    @app.on_event("startup")
    async def on_startup() -> None:  # noqa: D401
        """Application startup hook."""
        init_db()

    @app.get("/", tags=["meta"], summary="API metadata")
    def read_root() -> dict[str, str]:
        """Return a simple payload describing the API."""
        return {"message": "Welcome to Pathwise Python backend"}

    return app


app = create_app()
