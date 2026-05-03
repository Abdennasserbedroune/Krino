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
        return {"message": "Welcome to Krino Python backend"}

    return app


app = create_app()
