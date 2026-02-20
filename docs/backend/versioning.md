# CV Generation and Versioning

## Overview

The CV generation system creates improved versions of resumes by combining parsed data, analysis insights, and optional AI assistance (Groq). Each improved version is tracked with metadata, diff summaries, and stored as both JSON and PDF formats.

## Architecture

### Core Components

1. **cvGenerationService** - Orchestrates CV improvement workflow
2. **ImprovedCv Model** - Stores improved CV data, diffs, and file references
3. **PDF Generator** - Converts OpenResume JSON schema to formatted PDF
4. **Diff Calculator** - Tracks changes between original and improved versions

### Data Flow

```
Original CV → Parse → Analyze → Generate Improved → Store (JSON + PDF)
                                    ↓
                            Optional: Groq AI Enhancement
```

## Generation Process

### Step 1: Validation

Before generation begins, the system validates:
- CV exists and is accessible
- ParsedCvData is available (triggers parsing if missing)
- CvAnalysis exists (returns error if missing)
- Regeneration rules (checks if improved version already exists)

### Step 2: Data Assembly

The service combines:
- **Parsed CV Data**: Structured profile, work experience, education, skills, etc.
- **Analysis Suggestions**: Top issues and recommendations from analysis phase
- **User Prompt** (optional): Custom instructions for improvement

### Step 3: Improvement Generation

Two modes are available:

#### Mode A: Groq AI Assistance (Default)

Uses Groq LLM to intelligently improve the CV:

1. **System Prompt**: Defines rules for CV improvement (action verbs, quantification, ATS optimization)
2. **User Message**: Contains original data, analysis score, critical issues, and top suggestions
3. **Response Parsing**: Extracts JSON from Groq response matching OpenResume schema
4. **Validation**: Ensures all required fields are present, falls back to original data if missing

**Benefits**:
- Natural language improvements
- Context-aware rewording
- Follows industry best practices

#### Mode B: Rule-Based Generation

Applies programmatic transformations:

1. **Summary Enhancement**: Adds professional summary if missing/insufficient
2. **Bullet Point Optimization**: Replaces weak verbs with strong action verbs
3. **Formatting Fixes**: Ensures consistency across sections

**Benefits**:
- Fast and deterministic
- No API dependencies
- Predictable outcomes

### Step 4: Diff Calculation

The system generates a detailed comparison:

```typescript
{
  totalChanges: number,
  changes: [
    {
      section: "workExperience",
      field: "Company Name - bullet 1",
      before: "Responsible for managing team",
      after: "Led cross-functional team of 8 engineers",
      changeType: "modified"
    }
  ],
  improvementAreas: ["Work Experience Content", "Professional Summary"]
}
```

**Change Types**:
- `added` - New content added
- `removed` - Content removed
- `modified` - Existing content improved

### Step 5: File Generation

Two output formats are created:

#### JSON Output (`improved-v{n}.json`)

Contains the complete improved CV in OpenResume schema format:

```json
{
  "profile": { "name": "...", "email": "...", ... },
  "workExperience": [...],
  "education": [...],
  "skills": [...],
  "projects": [...],
  "certifications": [...],
  "languages": [...]
}
```

**Location**: `storage/cv/{cvId}/improved-v{n}.json`

#### PDF Output (`improved-v{n}.pdf`)

Professional formatted PDF using PDFKit:

- **Header**: Name, contact info, professional links
- **Sections**: Professional summary, work experience, education, skills, projects, certifications, languages
- **Formatting**: Consistent fonts (Helvetica), proper spacing, bullet points
- **Layout**: A4 size, 50pt margins

**Location**: `storage/cv/{cvId}/improved-v{n}.pdf`

### Step 6: Database Record

Creates `ImprovedCv` document with:

```typescript
{
  cvId: ObjectId,
  analysisId: ObjectId,
  status: "ready",
  improvedData: { ... },
  diffSummary: { ... },
  files: {
    pdfPath: "cv/{cvId}/improved-v1.pdf",
    jsonPath: "cv/{cvId}/improved-v1.json"
  },
  generationMetadata: {
    generatedAt: Date,
    modelUsed: "groq" | "rule-based",
    processingTimeMs: 5432,
    userPrompt?: "..."
  }
}
```

## Versioning Strategy

### Version Numbering

Each improved CV receives an incremental version number:

- **v1**: First generated improvement
- **v2**: Second generation (regeneration)
- **v3**: Third generation, etc.

Version number is calculated as:
```typescript
version = (count of existing ImprovedCv documents for cvId) + 1
```

### Original vs Improved Tracking

#### Original CVs

Stored in `Cv` model with version history:

```typescript
{
  currentVersion: 1,
  versionHistory: [
    {
      version: 1,
      filePath: "cv/{cvId}/original-v1.pdf",
      checksum: "sha256hash...",
      fileSize: 245678,
      uploadedAt: Date
    }
  ]
}
```

**File Path Pattern**: `cv/{cvId}/original-v{version}.pdf`

#### Improved CVs

Each improvement is stored as a separate `ImprovedCv` document:

```typescript
[
  {
    _id: "...",
    cvId: "abc123",
    files: { pdfPath: "cv/abc123/improved-v1.pdf", ... },
    createdAt: "2024-01-15"
  },
  {
    _id: "...",
    cvId: "abc123",
    files: { pdfPath: "cv/abc123/improved-v2.pdf", ... },
    createdAt: "2024-01-20"
  }
]
```

**File Path Pattern**: `cv/{cvId}/improved-v{version}.{pdf|json}`

### Regeneration Rules

When `POST /api/cv/:cvId/generate` is called:

**Default Behavior** (`regenerate: false`):
- Check if an improved CV with status "ready" already exists
- If yes, return existing improved CV
- If no, generate new version

**Force Regeneration** (`regenerate: true`):
- Always generate a new version
- Increment version number
- Create new files and database record
- Previous versions remain intact

## API Endpoints

### POST /api/cv/:cvId/generate

Generates an improved version of the CV.

**Request Body**:
```json
{
  "useGroqAssistance": true,
  "userPrompt": "Focus on leadership skills",
  "regenerate": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "improvedCvId": "...",
    "cvId": "...",
    "status": "ready",
    "diffSummary": {
      "totalChanges": 15,
      "changes": [...],
      "improvementAreas": [...]
    },
    "files": {
      "pdfPath": "cv/{cvId}/improved-v1.pdf",
      "jsonPath": "cv/{cvId}/improved-v1.json"
    },
    "generationMetadata": {
      "generatedAt": "...",
      "modelUsed": "groq",
      "processingTimeMs": 5432
    }
  }
}
```

**Error Codes**:
- `400` - Invalid request (missing cvId)
- `404` - CV not found or no analysis available
- `500` - Generation failed

### GET /api/cv/:cvId/download

Downloads CV files (original, improved PDF, or improved JSON).

**Query Parameters**:
- `type`: `"original"` | `"improved"` | `"json"` (default: "original")
- `version`: Optional version number (defaults to latest)

**Examples**:

Download original CV (latest version):
```
GET /api/cv/abc123/download?type=original
```

Download specific version of original CV:
```
GET /api/cv/abc123/download?type=original&version=1
```

Download improved CV (latest):
```
GET /api/cv/abc123/download?type=improved
```

Download specific improved version:
```
GET /api/cv/abc123/download?type=improved&version=2
```

Download improved JSON:
```
GET /api/cv/abc123/download?type=json
```

**Response**:
- Content-Type: `application/pdf` or `application/json`
- Content-Disposition: `attachment; filename="..."`
- Body: File stream

**Error Codes**:
- `400` - Invalid type parameter
- `404` - CV or version not found
- `500` - Error streaming file

## File Storage Organization

```
storage/
└── cv/
    └── {cvId}/
        ├── original-v1.pdf
        ├── improved-v1.pdf
        ├── improved-v1.json
        ├── improved-v2.pdf
        ├── improved-v2.json
        └── ...
```

**Storage Best Practices**:
1. All paths stored in database are relative to `FILE_STORAGE_ROOT`
2. Version numbers are embedded in filenames for easy identification
3. JSON files enable re-importing and editing without PDF parsing
4. Original files are never modified or deleted

## OpenResume Schema Compliance

The improved CV JSON adheres to the OpenResume schema:

### Profile
```typescript
{
  name: string,
  email: string,
  phone: string,
  location: string,
  linkedin: string,
  github: string,
  website: string,
  summary: string
}
```

### Work Experience
```typescript
{
  company: string,
  position: string,
  location?: string,
  startDate?: string,
  endDate?: string,
  current?: boolean,
  description?: string[]
}
```

### Education
```typescript
{
  institution: string,
  degree?: string,
  field?: string,
  location?: string,
  startDate?: string,
  endDate?: string,
  gpa?: string,
  description?: string[]
}
```

### Skills
```typescript
{
  category: string,
  skills: string[]
}
```

### Projects
```typescript
{
  name: string,
  description?: string,
  technologies?: string[],
  url?: string,
  startDate?: string,
  endDate?: string
}
```

### Certifications
```typescript
{
  name: string,
  issuer?: string,
  date?: string,
  expiryDate?: string,
  credentialId?: string,
  url?: string
}
```

## Template Strategy

The PDF generator uses a single professional template with:

### Typography
- **Headings**: 14pt Helvetica-Bold, underlined
- **Name**: 24pt Helvetica-Bold, centered
- **Subheadings**: 11-12pt Helvetica-Bold
- **Body**: 10pt Helvetica
- **Metadata**: 9pt Helvetica

### Layout
- **Margins**: 50pt on all sides
- **Spacing**: 0.3-1.0 moveDown units between elements
- **Alignment**: Left-aligned content, centered header
- **Bullet Points**: 20pt indent with "•" symbol

### Color Scheme
- Primary: Black text
- Links: Blue (for URLs)
- Consistent professional appearance

**Future Enhancement**: Support for multiple templates (modern, classic, minimal, etc.)

## Performance Considerations

### Generation Time

Typical processing times:
- **Rule-based**: 500-1000ms
- **Groq-assisted**: 3000-8000ms (depends on API latency)

### Optimization Strategies

1. **Async Processing**: Generation can be done asynchronously after endpoint response
2. **Caching**: Reuse existing improved CVs when regenerate=false
3. **Parallel Operations**: PDF and JSON generation can run in parallel
4. **Streaming**: Download endpoint streams files to avoid memory issues with large PDFs

## Error Handling

### Generation Failures

If generation fails:
1. `ImprovedCv` status is set to "failed"
2. Error is logged with stack trace
3. Database record persists for debugging
4. User receives 500 error with message

### Groq API Errors

If Groq fails (timeout, rate limit, invalid response):
1. Error is caught and logged
2. Could fall back to rule-based generation (optional)
3. User receives clear error message

### File System Errors

If file write fails:
1. Database transaction rolls back (or status set to failed)
2. Partial files are not cleaned up (for debugging)
3. Next generation attempt will overwrite

## Security Considerations

1. **File Access**: Download endpoint validates CV ownership (should add userId check)
2. **Path Traversal**: All paths constructed using `path.join()` to prevent traversal attacks
3. **File Size**: PDF generation has implicit size limits from PDFKit
4. **Injection**: Groq responses are parsed as JSON, preventing code injection

## Future Enhancements

### Planned Features

1. **Multiple Templates**: Support for different PDF design templates
2. **DOCX Export**: Generate Word documents in addition to PDFs
3. **Collaborative Editing**: Allow manual edits to improved JSON before PDF generation
4. **A/B Testing**: Generate multiple variations and let user choose
5. **Version Comparison**: Visual diff UI showing changes between versions
6. **Rollback**: Ability to revert to previous improved version
7. **Export History**: Track which versions were downloaded/shared

### Scalability

For high-volume deployments:
1. **Queue System**: Move generation to background job queue (Bull, BullMQ)
2. **Object Storage**: Use S3/GCS instead of local filesystem
3. **CDN**: Serve downloadable PDFs through CDN
4. **Caching Layer**: Cache frequently accessed files in Redis
5. **Rate Limiting**: Limit generation requests per user/time window

## Troubleshooting

### Common Issues

**Issue**: "No analysis found" error
- **Cause**: CV was uploaded but never analyzed
- **Solution**: Call `POST /api/cv/:cvId/analyze` before generation

**Issue**: PDF generation fails silently
- **Cause**: Invalid data in improvedData (missing required fields)
- **Solution**: Check logs for PDFKit errors, validate data structure

**Issue**: Download returns 404 but record exists
- **Cause**: File was deleted from disk or path mismatch
- **Solution**: Regenerate improved CV to recreate files

**Issue**: Groq timeout
- **Cause**: Large CV or slow API response
- **Solution**: Increase timeout in groqService or use rule-based fallback

## Monitoring

### Key Metrics

1. **Generation Success Rate**: Track failed vs successful generations
2. **Processing Time**: Monitor P50, P95, P99 latencies
3. **Groq Usage**: Track API calls, tokens, costs
4. **Storage Growth**: Monitor disk usage for CV files
5. **Download Volume**: Track which versions are downloaded most

### Logging

All operations log:
- `cvId` - The CV being processed
- `improvedCvId` - Generated improved CV ID
- `version` - Version number
- `totalChanges` - Number of improvements made
- `processingTimeMs` - Total time taken
- `modelUsed` - "groq" or "rule-based"

Example log:
```json
{
  "level": "info",
  "cvId": "abc123",
  "improvedCvId": "def456",
  "version": 2,
  "totalChanges": 15,
  "processingTimeMs": 5432,
  "msg": "Improved CV generated successfully"
}
```
