# Entity Relationship Diagrams

## Visual Overview

### Complete System Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                        External System                            │
│                                                                   │
│  ┌─────────────┐                                                 │
│  │    User     │                                                 │
│  │             │                                                 │
│  │ - userId    │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          │ owns (1:N)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Cv Document                            │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Cv                                                    │       │
│  │ _id: ObjectId                                         │       │
│  │ userId: string (indexed)                              │       │
│  │ status: CvStatus (indexed)                            │       │
│  │   - uploaded                                          │       │
│  │   - parsing                                           │       │
│  │   - parsed                                            │       │
│  │   - analyzing                                         │       │
│  │   - analyzed                                          │       │
│  │   - error                                             │       │
│  │ currentVersion: number                                │       │
│  │ versionHistory: [...]                                 │       │
│  │ metadata: {...}                                       │       │
│  │ createdAt: Date                                       │       │
│  │ updatedAt: Date                                       │       │
│  └───────────┬──────────┬──────────┬─────────┬──────────┘       │
│              │          │          │         │                  │
└──────────────┼──────────┼──────────┼─────────┼──────────────────┘
               │          │          │         │
      ┌────────┘          │          │         └────────┐
      │                   │          │                  │
      │ references        │          │                  │ references
      │ (1:1 per version) │          │                  │ (1:N by time)
      ▼                   │          │                  ▼
┌────────────────┐        │          │         ┌────────────────┐
│ ParsedCvData   │        │          │         │   ImprovedCv   │
│                │        │          │         │                │
│ _id: ObjectId  │        │          │         │ _id: ObjectId  │
│ cvId: ref      │◄───────┤          │         │ cvId: ref      │
│ version: int   │        │          │         │ analysisId: ref│
│                │        │          │         │ status: enum   │
│ Profile:       │        │          │         │ improvedData   │
│ - name         │        │          │         │ diffSummary    │
│ - email        │        │          │         │ files:         │
│ - phone        │        │          │         │   - pdfPath    │
│ - ...          │        │          │         │   - docxPath   │
│                │        │          │         │   - jsonPath   │
│ Work Exp: []   │        │          │         │ userFeedback   │
│ Education: []  │        │          │         │ createdAt      │
│ Skills: []     │        │          │         │ updatedAt      │
│ Projects: []   │        │          │         └────────────────┘
│ Certs: []      │        │          │
│                │        │          │
│ Confidence     │        │          │
│ Scores: []     │        │          │
│                │        │          │
│ parsingMeta    │        │          │
│ createdAt      │        │          │
│ updatedAt      │        │          │
└────────┬───────┘        │          │
         │                │          │
         │ used by        │          │ generates (1:N)
         │                │          │
         └────────────────┼──────────┘
                          │
                          │ references (1:1)
                          ▼
                 ┌────────────────┐
                 │   CvAnalysis   │
                 │                │
                 │ _id: ObjectId  │
                 │ cvId: ref      │
                 │ parsedDataId   │
                 │ version: int   │
                 │                │
                 │ Issues: []     │
                 │ - category     │
                 │ - severity     │
                 │ - title        │
                 │ - description  │
                 │ - suggestion   │
                 │                │
                 │ Suggestions: []│
                 │ - type         │
                 │ - title        │
                 │ - priority     │
                 │                │
                 │ ScoreBreakdown │
                 │ - overall      │
                 │ - formatting   │
                 │ - content      │
                 │ - keywords     │
                 │ - structure    │
                 │ - atsCompat    │
                 │                │
                 │ strengths: []  │
                 │ weaknesses: [] │
                 │ targetJobMatch │
                 │ analysisMeta   │
                 │ createdAt      │
                 │ updatedAt      │
                 └────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       Chat Subsystem                              │
│                                                                   │
│  Cv ──────► ChatMessage (1:N grouped by conversationId)          │
│             │                                                     │
│             │ _id: ObjectId                                      │
│             │ cvId: ref (indexed)                                │
│             │ conversationId: string (indexed)                   │
│             │ role: ChatRole (user | assistant | system)         │
│             │ content: string                                    │
│             │ metadata:                                          │
│             │   - tokensUsed                                     │
│             │   - modelUsed                                      │
│             │   - responseTimeMs                                 │
│             │   - sentiment                                      │
│             │   - tags                                           │
│             │ createdAt: Date (indexed with cvId+convId)         │
│             │ updatedAt: Date                                    │
│             │                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Lifecycle Flow

### Phase 1: Upload & Parse
```
┌─────────┐    upload     ┌──────────────┐
│  User   │──────────────►│  Cv: UPLOADED│
└─────────┘               └──────┬───────┘
                                 │
                                 │ trigger parsing
                                 ▼
                          ┌──────────────┐
                          │ Cv: PARSING  │
                          └──────┬───────┘
                                 │
                          ┌──────▼────────┐
                          │ Parser Service│
                          └──────┬────────┘
                                 │
                                 │ extract data
                                 ▼
                          ┌──────────────────┐
                          │ ParsedCvData     │
                          │ (created)        │
                          └──────────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ Cv: PARSED   │
                          └──────────────┘
```

### Phase 2: Analysis
```
┌──────────────┐    trigger    ┌────────────────┐
│ Cv: PARSED   │──────────────►│ Cv: ANALYZING  │
└──────────────┘               └────────┬───────┘
                                        │
                                        │ analyze with AI
                                        ▼
                                 ┌──────────────┐
                                 │ AI Analyzer  │
                                 └──────┬───────┘
                                        │
                                        │ generate analysis
                                        ▼
                                 ┌──────────────────┐
                                 │  CvAnalysis      │
                                 │  (created)       │
                                 │  - issues        │
                                 │  - suggestions   │
                                 │  - scores        │
                                 └──────────────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ Cv: ANALYZED │
                                 └──────────────┘
```

### Phase 3: Improvement (Optional)
```
┌──────────────┐   request      ┌────────────────────┐
│    User      │───────────────►│ ImprovedCv: PENDING│
└──────────────┘                └────────┬───────────┘
                                         │
                                         │ queue generation
                                         ▼
                                 ┌───────────────────────┐
                                 │ ImprovedCv: GENERATING│
                                 └────────┬──────────────┘
                                          │
                                    ┌─────▼──────┐
                                    │ AI Service │
                                    └─────┬──────┘
                                          │
                                          │ generate improved version
                                          ▼
                                 ┌──────────────────┐
                                 │  ImprovedCv      │
                                 │  status: READY   │
                                 │  - improvedData  │
                                 │  - diffSummary   │
                                 │  - files         │
                                 └──────────────────┘
```

### Phase 4: Chat Interaction (Optional)
```
┌──────────┐   ask question    ┌─────────────────┐
│  User    │──────────────────►│ ChatMessage     │
└──────────┘                   │ role: USER      │
                               │ content: "..."   │
                               └────────┬────────┘
                                        │
                                        │ send to AI
                                        ▼
                                  ┌──────────┐
                                  │ AI Chat  │
                                  └────┬─────┘
                                       │
                                       │ respond
                                       ▼
                               ┌─────────────────┐
                               │ ChatMessage     │
                               │ role: ASSISTANT │
                               │ content: "..."   │
                               └─────────────────┘
```

## Index Strategy

### Cv Indexes
```
┌─────────────────────────────────────────┐
│ Index Name        │ Fields              │
├─────────────────────────────────────────┤
│ userId_1          │ userId (asc)        │
│ status_1          │ status (asc)        │
│ userId_1_createdAt_-1 │ userId + created│
│ status_1_createdAt_-1 │ status + created│
└─────────────────────────────────────────┘

Purpose: Fast user CV lookups, status filtering
```

### ParsedCvData Indexes
```
┌─────────────────────────────────────────┐
│ Index Name        │ Fields              │
├─────────────────────────────────────────┤
│ cvId_1            │ cvId (asc)          │
│ cvId_1_version_-1 │ cvId + version (desc)│
└─────────────────────────────────────────┘

Purpose: Latest parse lookup, version history
```

### CvAnalysis Indexes
```
┌───────────────────────────────────────────────┐
│ Index Name             │ Fields               │
├───────────────────────────────────────────────┤
│ cvId_1                 │ cvId (asc)           │
│ parsedDataId_1         │ parsedDataId (asc)   │
│ cvId_1_version_-1      │ cvId + version (desc)│
│ overall_-1             │ scoreBreakdown.overall│
└───────────────────────────────────────────────┘

Purpose: Analysis lookup, score ranking
```

### ChatMessage Indexes
```
┌─────────────────────────────────────────────────────┐
│ Index Name                    │ Fields              │
├─────────────────────────────────────────────────────┤
│ cvId_1                        │ cvId (asc)          │
│ conversationId_1              │ conversationId      │
│ cvId_1_conversationId_1_..    │ cvId + convId +     │
│                               │ createdAt (asc)     │
└─────────────────────────────────────────────────────┘

Purpose: Conversation retrieval, message ordering
```

### ImprovedCv Indexes
```
┌─────────────────────────────────────────┐
│ Index Name           │ Fields           │
├─────────────────────────────────────────┤
│ cvId_1               │ cvId (asc)       │
│ analysisId_1         │ analysisId       │
│ cvId_1_createdAt_-1  │ cvId + created   │
│ status_1_createdAt_-1│ status + created │
└─────────────────────────────────────────┘

Purpose: Latest improvement lookup, generation queue
```

## Query Patterns

### Common Queries

```typescript
// 1. Get user's CVs (uses userId_1_createdAt_-1)
Cv.find({ userId }).sort({ createdAt: -1 }).limit(20)

// 2. Get CV with full data (uses multiple indexes)
const cv = await Cv.findById(cvId)
const parsed = await ParsedCvData.findOne({ cvId }).sort({ version: -1 })
const analysis = await CvAnalysis.findOne({ cvId }).sort({ version: -1 })
const improved = await ImprovedCv.findOne({ cvId }).sort({ createdAt: -1 })

// 3. Get analyzing CVs (uses status_1_createdAt_-1)
Cv.find({ status: CvStatus.ANALYZING }).sort({ createdAt: -1 })

// 4. Get conversation (uses cvId_1_conversationId_1_createdAt_1)
ChatMessage.find({ cvId, conversationId }).sort({ createdAt: 1 })

// 5. Get high-scoring analyses (uses overall_-1)
CvAnalysis.find({ 'scoreBreakdown.overall': { $gte: 80 } })
  .sort({ 'scoreBreakdown.overall': -1 })
```

## Data Size Estimations

### Average Document Sizes

| Model | Avg Size | Fields Contributing |
|-------|----------|---------------------|
| Cv | 2-5 KB | Metadata, version history (grows) |
| ParsedCvData | 10-50 KB | Work experience, education (variable) |
| CvAnalysis | 5-15 KB | Issues, suggestions (variable) |
| ChatMessage | 0.5-2 KB | Small, many documents |
| ImprovedCv | 15-60 KB | Full improved data structure |

### Growth Projections

```
100 users × 3 CVs each = 300 CVs
├── Cv: 300 × 3 KB = 900 KB
├── ParsedCvData: 300 × 30 KB = 9 MB
├── CvAnalysis: 300 × 10 KB = 3 MB
├── ChatMessage: 300 CVs × 10 msgs × 1 KB = 3 MB
└── ImprovedCv: 300 × 40 KB = 12 MB
Total: ~28 MB for 100 users

10,000 users: ~2.8 GB
100,000 users: ~28 GB
```

---

**Last Updated**: 2025-01-10  
**Schema Version**: 1.0.0
