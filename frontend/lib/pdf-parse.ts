// Workaround for pdf-parse crashing on Vercel serverless
// pdf-parse's index.js tries to require a test PDF file at import time
// which doesn't exist in Vercel's deployment bundle.
// Instead, we import the actual parser directly.

import pdf from "pdf-parse/lib/pdf-parse.js";

export default pdf;
