import sys
import os
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from app.main import app
    print("Import successful")
except Exception as e:
    import traceback
    traceback.print_exc()
