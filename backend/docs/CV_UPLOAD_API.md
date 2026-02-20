# CV Upload API Documentation

## Overview

The CV Upload API provides a robust, secure endpoint for uploading resume/CV files to the Pathwise platform. It handles file validation, storage, versioning, and metadata tracking with comprehensive error handling.

## Endpoint

### POST `/api/cv/upload`

Upload a CV/resume file for processing and analysis.

## Request Format

**Content-Type**: `multipart/form-data`

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cv` | File | Yes | The CV/resume file to upload (PDF only) |
| `userId` | String | Yes | Unique identifier for the user uploading the CV |
| `labels` | String | No | Comma-separated labels for categorizing the CV (e.g., "software engineer, senior, remote") |

### File Constraints

- **Allowed File Types**: PDF (`application/pdf`)
- **Maximum File Size**: 10MB (configurable via `MAX_FILE_SIZE_MB` environment variable)
- **File Name**: Sanitized automatically; special characters replaced with underscores

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "cvId": "507f1f77bcf86cd799439011",
    "userId": "user-123",
    "status": "uploaded",
    "version": 1,
    "metadata": {
      "originalFilename": "john_doe_resume.pdf",
      "mimeType": "application/pdf",
      "fileSize": 245678,
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "checksum": "a3b2c1d4e5f6..."
    },
    "labels": ["software engineer", "senior"]
  }
}
```

### Error Responses

#### 400 Bad Request

**Missing File**
```json
{
  "status": "error",
  "message": "No file provided"
}
```

**Invalid File Type**
```json
{
  "status": "error",
  "message": "Invalid file type. Only application/pdf are allowed."
}
```

**File Too Large**
```json
{
  "status": "error",
  "message": "File size exceeds maximum allowed size of 10MB."
}
```

**Missing Required Fields**
```json
{
  "status": "error",
  "message": "Validation error: Invalid input: expected string, received undefined"
}
```

#### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

## File Storage

### Storage Structure

Files are stored in a deterministic, versioned directory structure:

```
{FILE_STORAGE_ROOT}/
├── temp/                           # Temporary upload directory (auto-cleaned)
└── cv/
    └── {cvId}/                     # Unique CV identifier
        └── original-v{n}.pdf       # Versioned file (n = version number)
```

**Example**: `./uploads/cv/507f1f77bcf86cd799439011/original-v1.pdf`

### Storage Features

- **Atomic Directory Creation**: Directories created recursively with proper permissions
- **Checksum Generation**: SHA-256 hash calculated for file integrity verification
- **Automatic Cleanup**: Temporary files removed after successful storage or on error
- **Version Tracking**: Each upload creates a new version entry in the database

## Upload Workflow

1. **Client sends multipart request** with CV file and metadata
2. **Multer middleware** intercepts and validates:
   - File type (MIME type check)
   - File size (enforces limits)
   - Temporarily stores in `{FILE_STORAGE_ROOT}/temp/`
3. **Controller validates metadata** using Zod schema:
   - `userId` presence and format
   - Optional `labels` parsing
4. **CV document created** in MongoDB:
   - Status: `uploaded`
   - Version: `1` (initial)
   - Metadata stored (filename, MIME type, timestamps)
5. **File moved to permanent storage**:
   - Target: `{FILE_STORAGE_ROOT}/cv/{cvId}/original-v1.pdf`
   - Directory created atomically if needed
6. **Checksum calculated** (SHA-256) and stored
7. **Version history updated** in CV document
8. **Temp file deleted** from temporary storage
9. **Success response returned** with CV metadata

### Error Handling

- **Pre-validation failures**: Temp file never created, immediate error response
- **Post-upload failures**: Temp file cleaned up automatically
- **Storage failures**: MongoDB transaction rolled back (no orphaned records)

## Usage Examples

### cURL

```bash
# Basic upload
curl -X POST http://localhost:8000/api/cv/upload \
  -F "cv=@/path/to/resume.pdf" \
  -F "userId=user-123"

# Upload with labels
curl -X POST http://localhost:8000/api/cv/upload \
  -F "cv=@/path/to/resume.pdf" \
  -F "userId=user-123" \
  -F "labels=software engineer, senior, remote"
```

### JavaScript (Fetch API)

```javascript
const formData = new FormData();
formData.append('cv', fileInput.files[0]);
formData.append('userId', 'user-123');
formData.append('labels', 'software engineer, senior');

const response = await fetch('http://localhost:8000/api/cv/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('CV uploaded:', result.data.cvId);
```

### Python (requests)

```python
import requests

files = {'cv': open('/path/to/resume.pdf', 'rb')}
data = {
    'userId': 'user-123',
    'labels': 'software engineer, senior'
}

response = requests.post(
    'http://localhost:8000/api/cv/upload',
    files=files,
    data=data
)

result = response.json()
print(f"CV uploaded: {result['data']['cvId']}")
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FILE_STORAGE_ROOT` | `./uploads` | Root directory for file storage |
| `MAX_FILE_SIZE_MB` | `10` | Maximum file size in megabytes |
| `ALLOWED_FILE_TYPES` | `application/pdf` | Comma-separated list of allowed MIME types |

### Customizing Limits

Edit your `.env` file:

```env
# Increase max file size to 20MB
MAX_FILE_SIZE_MB=20

# Allow PDFs and Word documents
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

## Security Considerations

### Implemented Security Measures

1. **File Type Validation**: MIME type checked at middleware level
2. **File Size Limits**: Prevents DoS attacks via large uploads
3. **Filename Sanitization**: Special characters removed/replaced
4. **Checksum Verification**: SHA-256 hash stored for integrity checks
5. **Atomic Operations**: Files moved atomically to prevent corruption
6. **Error Isolation**: Failed uploads don't leave orphaned files or database records

### Best Practices

- **Authentication**: Add authentication middleware before deploying to production
- **Rate Limiting**: Implement per-user rate limits on upload endpoint
- **Virus Scanning**: Consider adding antivirus scanning for uploaded files
- **Access Control**: Ensure users can only access their own CVs
- **HTTPS**: Always use HTTPS in production environments

## Database Schema

### CV Document Structure

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  userId: "user-123",
  status: "uploaded",  // enum: uploaded, parsing, parsed, analyzing, analyzed, error
  labels: ["software engineer", "senior"],
  currentVersion: 1,
  versionHistory: [
    {
      version: 1,
      filePath: "cv/507f1f77bcf86cd799439011/original-v1.pdf",
      checksum: "a3b2c1d4e5f6...",
      fileSize: 245678,
      uploadedAt: ISODate("2024-01-15T10:30:00.000Z"),
      uploadedBy: "user-123"
    }
  ],
  metadata: {
    originalFilename: "john_doe_resume.pdf",
    mimeType: "application/pdf",
    uploadedAt: ISODate("2024-01-15T10:30:00.000Z"),
    uploadedBy: "user-123",
    lastModifiedAt: ISODate("2024-01-15T10:30:00.000Z")
  },
  createdAt: ISODate("2024-01-15T10:30:00.000Z"),
  updatedAt: ISODate("2024-01-15T10:30:00.000Z")
}
```

## Testing

Integration tests are provided to verify the upload functionality.

### Run Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Test Coverage

- ✓ Valid PDF upload and metadata return
- ✓ File storage in correct directory structure
- ✓ Optional labels parsing
- ✓ Rejection of requests without file
- ✓ Rejection of requests without userId
- ✓ Rejection of non-PDF files
- ✓ Rejection of oversized files
- ✓ Checksum generation and storage

## Future Enhancements

### Planned Features

1. **Multiple File Formats**: Support for DOCX, TXT, RTF
2. **Versioning Support**: Upload new versions of existing CVs
3. **Async Processing**: Queue-based processing for large files
4. **Webhooks**: Notify external systems on upload completion
5. **Batch Upload**: Support multiple CV uploads in a single request
6. **Preview Generation**: Generate PDF thumbnails for quick preview
7. **OCR Support**: Extract text from scanned PDFs
8. **Duplicate Detection**: Identify and prevent duplicate uploads

### Domain Events

The upload service emits the following events (ready for implementation):

- `cv.uploaded`: Fired when CV successfully stored
- `cv.upload.failed`: Fired when upload fails
- `cv.version.created`: Fired when new version added

## Troubleshooting

### Common Issues

**Upload fails with "Invalid file type"**
- Ensure file is a valid PDF
- Check `ALLOWED_FILE_TYPES` environment variable

**Upload fails with "File too large"**
- Check file size is under the limit
- Adjust `MAX_FILE_SIZE_MB` if needed

**Storage directory errors**
- Ensure `FILE_STORAGE_ROOT` is writable
- Check directory permissions

**MongoDB connection errors**
- Verify `MONGODB_URI` is correct
- Ensure MongoDB is running and accessible

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [troubleshooting guide](../README.md#troubleshooting)
- Open an issue on the project repository
