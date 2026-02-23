/**
 * PDF Parse wrapper with serverless environment fix
 * The pdf-parse library has a bug where it tries to read a test file in serverless environments.
 * This wrapper patches that behavior.
 */

import pdfParse from "pdf-parse";

interface PdfData {
  text: string;
  numpages: number;
  info: any;
  metadata: any;
  version: string;
}

export async function parsePdf(buffer: Buffer): Promise<PdfData> {
  // Set a dummy path to prevent pdf-parse from trying to read the test file
  // This is a known workaround for serverless environments
  const originalArgs = process.argv;
  process.argv = ["node", "/tmp/dummy.pdf"];

  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text || "",
      numpages: data.numpages || 1,
      info: data.info || {},
      metadata: data.metadata || {},
      version: data.version || "unknown",
    };
  } finally {
    // Restore original argv
    process.argv = originalArgs;
  }
}

export default parsePdf;
