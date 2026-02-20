import sys
import traceback

libs = ["pydantic", "fastapi", "uvicorn", "spacy", "thinc", "textstat", "xhtml2pdf", "celery", "redis"]

for lib in libs:
    try:
        print(f"Importing {lib}...")
        __import__(lib)
        print(f"Successfully imported {lib}")
    except Exception:
        print(f"Failed to import {lib}")
        traceback.print_exc()
        break
