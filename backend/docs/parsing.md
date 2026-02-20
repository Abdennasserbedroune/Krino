# CV Parsing Pipeline Documentation

## Overview

The CV parsing pipeline extracts structured data from uploaded PDF resumes and maps them to an OpenResume-inspired schema. This document covers the parsing strategy, normalization rules, error handling, and re-parse workflows.

## Architecture

### Pipeline Flow

```
┌──────────────┐
│  CV Upload   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Status:    │
│  UPLOADED    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Parsing    │ ◄─── Triggered async after upload
│   Service    │
└──────┬───────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────────┐  ┌──────────────┐
│  SUCCESS     │  │    FAILED    │
│  Status:     │  │   Status:    │
│  PARSED      │  │    ERROR     │
└──────┬───────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│ ParsedCvData │
│  Collection  │
└──────────────┘
```

## Dependencies

### Core Libraries

1. **pdf-parse** (v1.1.1+)
   - PDF text extraction
   - Lightweight, no external dependencies
   - Works with Node.js buffers

2. **mongoose** (v8.19.3+)
   - MongoDB ODM for data persistence
   - Schema validation

3. **zod** (v4.1.12+)
   - Runtime type validation
   - Schema inference

### Configuration

Add to `package.json`:

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.4"
  }
}
```

Environment variables (`.env`):

```env
FILE_STORAGE_ROOT=./uploads
```

## Parsing Phases

### Phase 1: Pre-Processing

**Purpose**: Prepare CV for parsing

**Steps**:
1. Retrieve CV document from MongoDB
2. Update status to `PARSING`
3. Locate PDF file from storage
4. Read file into buffer

**Error Handling**:
- CV not found → Return error
- File not found → Update status to `ERROR`

### Phase 2: Text Extraction

**Purpose**: Extract raw text from PDF

**Implementation**:
```typescript
const fileBuffer = await fs.readFile(filePath);
const pdfData = await pdfParse(fileBuffer);
const rawText = pdfData.text;
```

**Characteristics**:
- Preserves line breaks
- Maintains text order
- Extracts metadata (page count, info)

**Limitations**:
- No formatting (bold, italic) preserved
- Tables may lose structure
- Multi-column layouts can scramble order

### Phase 3: Content Extraction

**Purpose**: Map text to structured sections

#### 3.1 Profile Extraction

**Fields Extracted**:
- Name (first non-empty line, 2-5 words)
- Email (regex pattern matching)
- Phone (various formats)
- LinkedIn, GitHub, Website URLs
- Location (city, state patterns)
- Summary/Objective (keyword-based)

**Strategy**:
```typescript
// Name: First meaningful line
const name = lines.find(line => line.length > 2 && line.length < 60);

// Email: Standard regex
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Phone: Multiple formats
const phonePattern = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
```

#### 3.2 Work Experience Extraction

**Section Detection**:
- Keywords: "work experience", "professional experience", "employment"
- Boundaries: Next major section or end of document

**Entry Pattern**:
```
Company Name
Job Title
Location (optional)
Date Range (Month Year - Month Year)
• Bullet point 1
• Bullet point 2
```

**Extracted Fields**:
- Company (required)
- Position (required)
- Location (optional)
- Start Date (normalized)
- End Date (normalized, or "current" flag)
- Description bullets (normalized)

#### 3.3 Education Extraction

**Section Detection**:
- Keywords: "education", "academic background"

**Entry Pattern**:
```
Institution Name
Degree, Field of Study
Location (optional)
Date Range
• Additional details
```

**Extracted Fields**:
- Institution (required)
- Degree (Bachelor, Master, PhD, etc.)
- Field of study
- Start/End dates
- GPA (if present)
- Description bullets

#### 3.4 Skills Extraction

**Formats Supported**:

1. **Categorized**:
   ```
   Programming Languages: JavaScript, Python, Go
   Frameworks: React, Django, Express
   ```

2. **Flat List**:
   ```
   JavaScript, Python, React, Node.js, PostgreSQL
   ```

**Processing**:
- Split by delimiters (comma, semicolon, pipe)
- Deduplicate (case-insensitive)
- Group into categories (or use "General" default)

#### 3.5 Projects Extraction

**Section Detection**:
- Keywords: "projects", "personal projects", "side projects"

**Entry Pattern**:
```
Project Name
Brief description
Technologies: React, Node.js, MongoDB
```

**Extracted Fields**:
- Name (required)
- Description
- Technologies list
- URL (if present)
- Date range (if present)

#### 3.6 Certifications Extraction

**Formats**:
- "AWS Certified Solutions Architect, March 2023"
- "Google Cloud Professional Developer - January 2022"

**Processing**:
- Line-by-line parsing
- Date extraction and normalization
- Optional issuer detection

#### 3.7 Languages Extraction

**Format**:
```
English (Native)
Spanish (Professional)
French (Conversational)
```

**Processing**:
- Remove proficiency levels in parentheses
- Deduplicate
- Simple list format

### Phase 4: Normalization

#### Date Normalization

**Input Formats Supported**:
- ISO: `2024-01-15`, `2024-01`
- Month-Year: `January 2024`, `Jan 2024`
- Year only: `2024`
- Slash format: `01/2024`
- Keywords: `Present`, `Current` → `undefined`

**Output Format**:
- `YYYY-MM-DD` (full date)
- `YYYY-MM` (month/year)
- `YYYY` (year only)

**Function**:
```typescript
normalizeDate('January 2024')  // → '2024-01'
normalizeDate('Present')       // → undefined
```

#### Phone Number Normalization

**Input Formats**:
- `(555) 123-4567`
- `555-123-4567`
- `+1 555 123 4567`
- `15551234567`

**Output Format**: E.164 format (`+15551234567`)

**Function**:
```typescript
normalizePhoneNumber('(555) 123-4567')  // → '+15551234567'
```

#### Location Normalization

**Processing**:
- Trim whitespace
- Collapse multiple spaces
- Remove duplicate commas
- Standardize format

**Function**:
```typescript
normalizeLocation('San  Francisco,  CA')  // → 'San Francisco, CA'
```

#### Bullet Point Normalization

**Processing Steps**:
1. Remove bullet symbols (`•`, `-`, `*`, `→`, etc.)
2. Remove numbering (`1.`, `2.`, etc.)
3. Capitalize first letter
4. Add period if missing
5. Filter empty bullets

**Function**:
```typescript
normalizeBulletPoints([
  '• built APIs',
  '- improved performance'
])
// → ['Built APIs.', 'Improved performance.']
```

#### Skill Deduplication

**Processing**:
- Case-insensitive comparison
- Preserve original casing of first occurrence
- Alphabetical sorting

**Function**:
```typescript
deduplicateSkills(['JavaScript', 'javascript', 'Python'])
// → ['JavaScript', 'Python']
```

### Phase 5: Confidence Scoring

**Purpose**: Indicate extraction confidence

**Scoring Rules**:

| Field | Score | Criteria |
|-------|-------|----------|
| Email | 0.98 | Regex match |
| Name | 0.95 | Position-based |
| Phone | 0.85 | Format match |
| Education | 0.85 | Section found |
| Work Experience | 0.80 | Section found |
| Skills | 0.75 | Section found |

**Usage**:
- Highlight uncertain fields in UI
- Prioritize manual review
- Trigger re-parsing with different settings

### Phase 6: Validation

**Zod Schema Validation**:

```typescript
const parsedCvDataSchema = z.object({
  cvId: z.string(),
  version: z.number().int().positive(),
  profile: profileSchema,
  workExperience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  skills: z.array(skillCategorySchema),
  projects: z.array(projectSchema),
  certifications: z.array(certificationSchema),
  // ...
});
```

**Validation Points**:
- Email format
- URL format (LinkedIn, GitHub, Website)
- Date formats (after normalization)
- Array types for collections
- Required vs optional fields

### Phase 7: Persistence

**Steps**:
1. Create `ParsedCvData` document
2. Update `Cv` status to `PARSED`
3. Update `lastModifiedAt` timestamp
4. Log success metrics

**Data Stored**:
```typescript
{
  cvId: ObjectId,
  version: 1,
  profile: { /* ... */ },
  workExperience: [ /* ... */ ],
  education: [ /* ... */ ],
  skills: [ /* ... */ ],
  projects: [ /* ... */ ],
  certifications: [ /* ... */ ],
  languages: [ /* ... */ ],
  rawText: "Full PDF text...",
  confidenceScores: [ /* ... */ ],
  parsingMetadata: {
    parserVersion: "1.0.0",
    parseDate: Date,
    processingTimeMs: 1234,
    warnings: []
  }
}
```

## Status Transitions

### Success Path

```
UPLOADED → PARSING → PARSED
```

**Trigger**: Automatic after upload (via `setImmediate`)

**Actions**:
1. Update status to `PARSING`
2. Extract and normalize data
3. Persist `ParsedCvData`
4. Update status to `PARSED`

### Failure Path

```
UPLOADED → PARSING → ERROR
```

**Trigger**: Exception during parsing

**Error Capture**:
```typescript
{
  success: false,
  error: "Error message with details"
}
```

**Actions**:
1. Log error with cvId and stack trace
2. Update CV status to `ERROR`
3. Update `lastModifiedAt`
4. Return error response (for manual triggers)

### Status Checks

**Current Status Query**:
```typescript
const cv = await Cv.findById(cvId);
console.log(cv.status); // 'uploaded', 'parsing', 'parsed', 'error'
```

**Latest Parsed Data**:
```typescript
const parsedData = await ParsedCvData.findOne({ cvId })
  .sort({ version: -1 });
```

## Error Handling

### Common Errors

#### 1. File Not Found

**Cause**: Missing PDF in storage

**Recovery**:
- Verify `FILE_STORAGE_ROOT` configuration
- Check `versionHistory[].filePath` accuracy
- Re-upload CV if file was deleted

#### 2. PDF Parsing Failure

**Cause**: Corrupted PDF, encrypted PDF, image-based PDF

**Recovery**:
- Validate PDF integrity before upload
- Consider OCR for image-based PDFs (future enhancement)
- Request user to provide text-based PDF

#### 3. Extraction Failure

**Cause**: Non-standard CV format, heavily formatted document

**Recovery**:
- Log warnings for missing sections
- Allow partial data persistence
- Flag for manual review

#### 4. Validation Failure

**Cause**: Extracted data doesn't match schema

**Recovery**:
- Log validation errors
- Persist with warnings
- Allow manual correction via UI

### Warning System

**Non-Critical Issues**:

```typescript
warnings: [
  "No email found in CV",
  "No phone number found in CV",
  "No work experience found in CV"
]
```

**Storage**: `parsingMetadata.warnings[]`

**UI Display**: Show warnings to user, suggest improvements

## Re-Parse Strategies

### Manual Re-Parse

**Trigger**: User request (e.g., after CV update)

**Endpoint**: `POST /api/cv/:cvId/reparse`

**Implementation**:
```typescript
router.post('/:cvId/reparse', async (req, res) => {
  const { cvId } = req.params;
  const result = await cvParsingService.parseCv(cvId);
  res.json(result);
});
```

**Use Cases**:
- User uploads new version
- Parsing logic improved
- Initial parse had errors

### Version Management

**Scenario**: User uploads CV v2

**Process**:
1. New CV version stored
2. Trigger parsing for latest version
3. Create new `ParsedCvData` with `version: 2`
4. Keep historical parsed versions

**Query Latest**:
```typescript
ParsedCvData.findOne({ cvId }).sort({ version: -1 });
```

### Batch Re-Parse

**Scenario**: Parser algorithm updated

**Implementation**:
```typescript
const cvs = await Cv.find({ status: CvStatus.PARSED });
for (const cv of cvs) {
  await cvParsingService.parseCv(cv._id.toString());
}
```

**Considerations**:
- Run during off-peak hours
- Rate limit to avoid overload
- Track re-parse version in metadata

## Performance Considerations

### Parsing Speed

**Typical Timing**:
- Small CV (1-2 pages): 200-500ms
- Medium CV (3-4 pages): 500-1000ms
- Large CV (5+ pages): 1000-2000ms

**Tracked Metric**: `parsingMetadata.processingTimeMs`

### Optimization Strategies

1. **Async Processing**
   - Parse in background (via `setImmediate`)
   - Don't block upload response
   - Use job queue for scale (future: Bull/Celery)

2. **Caching**
   - Cache parsed data by checksum
   - Skip re-parse if file unchanged

3. **Indexing**
   - Index on `cvId + version` for fast lookups
   - Index on `cvId + createdAt` for history queries

## API Integration

### GET /api/cv/:cvId

**Purpose**: Retrieve CV with latest parsed data

**Response**:
```json
{
  "success": true,
  "data": {
    "cvId": "507f1f77bcf86cd799439011",
    "userId": "user-123",
    "status": "parsed",
    "currentVersion": 1,
    "metadata": {
      "originalFilename": "resume.pdf",
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-15T10:00:00Z",
      "lastModifiedAt": "2024-01-15T10:05:00Z"
    },
    "labels": ["software engineer", "senior"],
    "versionHistory": [
      {
        "version": 1,
        "uploadedAt": "2024-01-15T10:00:00Z",
        "fileSize": 245678
      }
    ],
    "parsedData": {
      "profile": {
        "name": "John Doe",
        "email": "john.doe@email.com",
        "phone": "+15551234567",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe"
      },
      "workExperience": [
        {
          "company": "Tech Corp",
          "position": "Senior Software Engineer",
          "location": "San Francisco, CA",
          "startDate": "2022-01",
          "current": true,
          "description": [
            "Led development of microservices.",
            "Improved performance by 40%."
          ]
        }
      ],
      "education": [ /* ... */ ],
      "skills": [ /* ... */ ],
      "projects": [ /* ... */ ],
      "certifications": [ /* ... */ ],
      "languages": [ /* ... */ ],
      "parsingMetadata": {
        "parserVersion": "1.0.0",
        "parseDate": "2024-01-15T10:05:00Z",
        "processingTimeMs": 1234,
        "warnings": []
      }
    }
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: CV doesn't exist
- `500 Internal Server Error`: Server error

**Security**: Sensitive storage paths excluded from response

## Testing

### Unit Tests

**Normalization Tests**:
```bash
npm test -- src/tests/cv-parsing.test.ts --testNamePattern="Normalization"
```

**Coverage**:
- Date normalization (10 test cases)
- Phone normalization (6 test cases)
- Location normalization (4 test cases)
- Bullet normalization (5 test cases)
- Skill deduplication (4 test cases)

### Integration Tests

**Full Pipeline Test**:
```bash
npm test -- src/tests/cv-parsing.test.ts --testNamePattern="CV Parsing Service"
```

**Test Fixtures**:
- `src/tests/fixtures/sample-cv.pdf`: Complete resume with all sections
- `src/tests/fixtures/sample-cv.txt`: Plain text source

**Assertions**:
- ✅ Successful parsing
- ✅ Profile extraction
- ✅ Work experience extraction
- ✅ Education extraction
- ✅ Skills extraction
- ✅ Confidence scores calculated
- ✅ Metadata stored
- ✅ Error handling

### Manual Testing

**Upload and Parse**:
```bash
curl -X POST http://localhost:8000/api/cv/upload \
  -F "cv=@/path/to/resume.pdf" \
  -F "userId=test-user"
```

**Check Status**:
```bash
curl http://localhost:8000/api/cv/{cvId}
```

**Verify Parsing**:
```bash
# Should show status: "parsed"
# Should include parsedData object
```

## Future Enhancements

### 1. AI-Powered Extraction

**Proposal**: Use LLM (GPT-4, Claude) for better extraction

**Benefits**:
- Handle non-standard formats
- Better context understanding
- Extract implicit information

**Implementation**:
```typescript
const aiExtraction = await groqService.extractCvData(rawText);
```

### 2. OCR Support

**Proposal**: Extract text from image-based PDFs

**Libraries**:
- Tesseract.js
- Google Cloud Vision API

**Flow**:
```
PDF → Check if text-based → If no: OCR → Extract text → Parse
```

### 3. Multi-Language Support

**Proposal**: Parse CVs in multiple languages

**Approach**:
- Detect language (langdetect)
- Translate section headers
- Apply language-specific patterns

### 4. Confidence Threshold Actions

**Proposal**: Auto-flag low-confidence extractions

**Rules**:
```typescript
if (confidenceScore < 0.6) {
  flagForManualReview();
}
```

### 5. Learning System

**Proposal**: Improve patterns based on corrections

**Flow**:
```
User corrects data → Log correction → Update extraction patterns → Re-train
```

## Troubleshooting

### Issue: No data extracted

**Symptoms**: Empty `workExperience`, `education`, etc.

**Diagnosis**:
1. Check `rawText` field: Is text extracted?
2. Review CV format: Are section headers standard?
3. Check logs for warnings

**Solutions**:
- Adjust section detection keywords
- Use AI extraction (future)
- Manual data entry

### Issue: Incorrect dates

**Symptoms**: Wrong or missing dates

**Diagnosis**:
1. Check original CV format
2. Review normalization output
3. Check for non-standard formats

**Solutions**:
- Extend `normalizeDate` patterns
- Add custom date parsers
- Flag for manual review

### Issue: Duplicate skills

**Symptoms**: "JavaScript" and "javascript" both present

**Diagnosis**: Deduplication not working

**Solution**: Ensure `deduplicateSkills` is called

### Issue: Missing email/phone

**Symptoms**: `null` values for contact info

**Diagnosis**:
1. Check regex patterns
2. Verify format in original CV
3. Check if buried in formatted sections

**Solutions**:
- Extend regex patterns
- Improve text extraction
- OCR for formatted content

## Monitoring

### Key Metrics

1. **Parse Success Rate**: `parsed / total`
2. **Average Processing Time**: `avg(processingTimeMs)`
3. **Error Rate**: `error / total`
4. **Warning Frequency**: Track common warnings

### Logging

**Structured Logs** (Pino):
```typescript
logger.info({
  cvId,
  parsedDataId,
  processingTimeMs,
  warnings,
  msg: 'CV parsed successfully'
});
```

**Log Queries**:
```bash
# Find parsing errors
grep "CV parsing failed" logs/app.log

# Average processing time
grep "processingTimeMs" logs/app.log | jq '.processingTimeMs' | avg
```

## Conclusion

The CV parsing pipeline provides a robust, extensible system for extracting structured data from resumes. With comprehensive normalization, error handling, and testing, it forms a solid foundation for AI-powered resume analysis.

For questions or improvements, see:
- `src/services/cvParsingService.ts` - Core parsing logic
- `src/utils/normalization.ts` - Normalization utilities
- `src/tests/cv-parsing.test.ts` - Test suite
