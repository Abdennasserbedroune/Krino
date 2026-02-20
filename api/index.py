import sys
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Add the backend directory to sys.path so 'app' and other modules can be found
root_dir = Path(__file__).parent.parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))

# Set VERCEL env var if not already set (for config detection)
os.environ.setdefault("VERCEL", "1")

try:
    from app.main import app
    logger.info("✅ FastAPI app loaded successfully")
except Exception as e:
    # If the full app fails to load, create a minimal fallback
    logger.error(f"❌ Failed to load FastAPI app: {e}")
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/")
    def fallback_root():
        return {"error": "Backend failed to load", "detail": str(e)}

    @app.get("/api/v1/health")
    def fallback_health():
        return {"status": "error", "detail": str(e)}

# Vercel expects the ASGI app to be named 'app'
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
