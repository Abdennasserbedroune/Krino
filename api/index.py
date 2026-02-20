import sys
import os
from pathlib import Path

# Add the backend directory to sys.path so 'app' and other modules can be found
# Root structure: 
# /api/index.py (this file)
# /backend/app/...
root_dir = Path(__file__).parent.parent
sys.path.append(str(root_dir / "backend"))

from app.main import app

# Vercel expects the FastAPI instance to be named 'app' by default if using Python runtime
# but since we are in api/index.py, it will map to /api
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
