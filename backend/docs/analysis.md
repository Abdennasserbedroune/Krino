# CV Analysis Service

The CV Analysis Service provides rule-driven, heuristic-based analysis of parsed CV data to identify structural gaps, formatting issues, weak language, and data inconsistencies. It generates a comprehensive score breakdown and actionable suggestions for improvement.

## Architecture

### Components

1. **cvAnalysisService** (`src/services/cvAnalysisService.ts`)
   - Core analysis engine
   - Implements rule-based evaluators
   - Generates scores, issues, and suggestions
   - Coordinates with parsing service when needed

2. **analysisWeights** (`src/config/analysisWeights.ts`)
   - Configuration module for scoring weights
   - Rule thresholds and parameters
   - Action verb dictionaries
   - Easy to tune and extend

3. **API Controllers** (`src/controllers/cvController.ts`)
   - `POST /api/cv/:cvId/analyze` - Trigger analysis
   - `GET /api/cv/:cvId/analysis` - Retrieve analysis results

## Analysis Methodology

### 1. Issue Detection

The service runs four categories of checks:

#### Structural Gaps
- **Missing Summary**: Detects absence or insufficient professional summary (< 50 chars)
- **No Work Experience**: Flags CVs without work history
- **Sparse Experience**: Identifies roles with fewer than 2 bullet points
- **Short Descriptions**: Detects bullet points under 30 characters
- **No Education**: Flags missing educational background
- **Missing Contact Info**: Critical check for email and phone number

#### Formatting Issues
- **Inconsistent Bullet Styles**: Detects mixing of bullet formats (•, -, *, numbered, or none)
- **Bullet Point Compliance**: Ensures proper formatting throughout experience section

#### Language Quality
- **Weak Action Verbs**: Measures usage of strong action verbs (target: 60%+ of bullets)
- **Passive Language**: Detects weak phrases like "responsible for", "helped with"
- **Lack of Quantification**: Identifies experience entries without measurable results (numbers, percentages, metrics)
- **Inconsistent Tense**: Flags mixing of past/present tense within single role
- **Too Many Skills**: Warns when skill count exceeds 50 (dilutes focus)

#### Data Consistency
- **Overlapping Dates**: Detects concurrent employment periods without clear indication
- **Location Mismatches**: (Placeholder for future enhancement)

### 2. Scoring Framework

The overall score (0-100) is a weighted combination of five subscores:

```typescript
Overall = (Formatting × 0.20) + (Content × 0.35) + (Keywords × 0.15) 
          + (Structure × 0.20) + (ATS Compatibility × 0.10)
```

#### Subscore Calculations

**Formatting Score** (Base: 100)
- Critical formatting issue: -20 points
- Warning: -10 points
- Suggestion: -5 points

**Content Score** (Base: 100, adjustable)
- Critical content/experience issue: -25 points
- Warning: -12 points
- Suggestion: -5 points
- Bonus: +5 if average bullets per role ≥ 4
- Penalty: -10 if average bullets < 2

**Keywords Score** (Base: 50, additive)
- 10-30 skills: +30
- 31-50 skills: +20
- 50+ skills: +10
- Has certifications: +10
- Has projects: +10

**Structure Score** (Base: 100)
- Critical structure issue: -30 points
- Warning: -15 points
- Suggestion: -5 points
- Penalty: -10 if summary < 100 characters
- Penalty: -5 if only 1 work experience entry

**ATS Compatibility Score** (Base: 90)
- Missing email or phone: -20 points
- Critical ATS issue: -25 points
- Other ATS issue: -10 points
- Bonus: +5 if has skills section
- Bonus: +5 if has both work experience and education

### 3. Suggestion Generation

The service generates up to 10 prioritized, actionable suggestions:

**Priority Levels**
- 10: Critical issues requiring immediate attention
- 8-9: High-priority optimizations
- 6-7: Moderate improvements
- 1-5: Nice-to-have enhancements

**Suggestion Types**
- `critical_*`: Derived from critical issues
- `content_optimization`: General content improvements
- `keywords`: Keyword and skills alignment
- `structure`: Structural enhancements

Each suggestion includes:
- Type identifier
- Title (concise summary)
- Description (detailed explanation)
- Priority score (1-10)
- Example text (for select suggestions)

### 4. Strengths & Weaknesses

**Strengths** (automatically identified)
- Strong professional summary (≥ 100 chars)
- Detailed work experience (≥ 4 bullets per role)
- Well-balanced skills (10-40 skills)
- Multiple certifications (≥ 2)
- Project portfolio (≥ 2)
- Professional online presence (LinkedIn/GitHub)

**Weaknesses** (derived from issues)
- Multiple issues in same category (≥ 3 instances)
- Critical issues count
- Top 5 most significant weaknesses highlighted

## Configuration & Tuning

### Adjusting Weights

Edit `src/config/analysisWeights.ts`:

```typescript
// Modify scoring weights (must sum to 1.0)
export const SCORING_WEIGHTS: WeightConfig = {
  formatting: 0.20,      // Increase for stricter formatting standards
  content: 0.35,         // Core weight - adjust based on content priority
  keywords: 0.15,        // Increase for keyword-heavy industries
  structure: 0.20,       // Base structural requirements
  atsCompatibility: 0.10 // Increase for ATS-focused analysis
};
```

### Adjusting Rule Thresholds

```typescript
export const RULE_WEIGHTS: RuleConfig = {
  missingSummary: { weight: 8, critical: true },
  sparseExperience: { weight: 10, minBullets: 2 },  // Increase minBullets for more detail
  educationGaps: { weight: 5, maxGapMonths: 24 },
  improperBullets: { weight: 7 },
  inconsistentTense: { weight: 6 },
  weakActionVerbs: { weight: 9, minScore: 0.6 },    // Lower minScore for more lenient checks
  overlappingDates: { weight: 8 },
  missingContactInfo: { weight: 10 },
  shortDescriptions: { weight: 5, minLength: 30 },  // Adjust minLength threshold
  tooManySkills: { weight: 4, maxSkills: 50 },      // Adjust maxSkills limit
  lackOfQuantification: { weight: 7 },
};
```

### Extending Action Verb Dictionary

Add industry-specific verbs:

```typescript
export const STRONG_ACTION_VERBS = [
  // Existing verbs...
  'achieved', 'accelerated', 'accomplished',
  // Add new verbs:
  'facilitated', 'coordinated', 'mentored', 'negotiated'
];

export const WEAK_VERBS = [
  // Add phrases to detect:
  'responsible for', 'duties included', 'tasked with'
];
```

## Extension Points

### Adding New Rule Evaluators

1. Create a new private method in `CvAnalysisService`:

```typescript
private checkNewRule(parsedData: IParsedCvData): IAnalysisIssue[] {
  const issues: IAnalysisIssue[] = [];
  
  // Your rule logic here
  if (/* condition */) {
    issues.push({
      category: AnalysisIssueCategory.CONTENT,
      severity: AnalysisIssueSeverity.WARNING,
      title: 'Issue Title',
      description: 'Issue description',
      location: { section: 'sectionName' },
      suggestion: 'Actionable improvement'
    });
  }
  
  return issues;
}
```

2. Call it from `detectIssues()`:

```typescript
private detectIssues(parsedData: IParsedCvData): IAnalysisIssue[] {
  const issues: IAnalysisIssue[] = [];
  
  issues.push(...this.checkStructuralGaps(parsedData));
  issues.push(...this.checkFormattingIssues(parsedData));
  issues.push(...this.checkLanguageQuality(parsedData));
  issues.push(...this.checkDataConsistency(parsedData));
  issues.push(...this.checkNewRule(parsedData));  // Add here
  
  return issues;
}
```

### Integrating AI-Powered Analysis (Optional)

To add Groq or OpenAI-powered narrative summaries:

1. Install dependencies:
```bash
npm install openai
```

2. Create AI service wrapper:

```typescript
// src/services/aiNarrativeService.ts
import OpenAI from 'openai';

export class AiNarrativeService {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || undefined
    });
  }
  
  async generateNarrative(
    parsedData: IParsedCvData,
    issues: IAnalysisIssue[],
    score: number
  ): Promise<string> {
    const prompt = `Analyze this CV and provide a narrative summary...`;
    
    const response = await this.client.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return response.choices[0].message.content || '';
  }
}
```

3. Integrate in analysis service:

```typescript
// In cvAnalysisService.ts
import { aiNarrativeService } from './aiNarrativeService';

async analyzeCv(cvId: string): Promise<AnalysisResult> {
  // ... existing code ...
  
  // Optional AI narrative
  let narrativeSummary: string | undefined;
  if (process.env.ENABLE_AI_NARRATIVE === 'true') {
    try {
      narrativeSummary = await aiNarrativeService.generateNarrative(
        parsedData,
        issues,
        scoreBreakdown.overall
      );
    } catch (error) {
      logger.warn({ error, msg: 'AI narrative generation failed, continuing with heuristics' });
    }
  }
  
  // Store narrativeSummary in analysis...
}
```

### Customizing Score Calculation

To implement custom scoring logic:

1. Create a new calculator method:

```typescript
private calculateCustomScore(
  parsedData: IParsedCvData,
  issues: IAnalysisIssue[]
): number {
  let score = 100;
  
  // Custom logic here
  // Example: Industry-specific checks
  if (isEngineeringCV(parsedData)) {
    if (!hasGitHub(parsedData)) score -= 15;
    if (!hasTechnicalProjects(parsedData)) score -= 10;
  }
  
  return Math.max(0, score);
}
```

2. Add to score breakdown:

```typescript
// Add new field to IScoreBreakdown interface
export interface IScoreBreakdown {
  overall: number;
  formatting: number;
  content: number;
  keywords: number;
  structure: number;
  atsCompatibility: number;
  customScore?: number;  // New field
  explanation?: string;
}

// Calculate and include
const customScore = this.calculateCustomScore(parsedData, issues);
// Adjust overall calculation to include customScore
```

## API Usage

### Trigger Analysis

```http
POST /api/cv/:cvId/analyze
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "507f1f77bcf86cd799439011",
    "cvId": "507f1f77bcf86cd799439012",
    "version": 1,
    "scoreBreakdown": {
      "overall": 72,
      "formatting": 85,
      "content": 68,
      "keywords": 75,
      "structure": 70,
      "atsCompatibility": 90,
      "explanation": "Good CV with strong fundamentals..."
    },
    "issues": [
      {
        "category": "content",
        "severity": "warning",
        "title": "Weak Action Verbs",
        "description": "Only 45% of bullet points use strong action verbs.",
        "location": { "section": "workExperience", "line": 0 },
        "suggestion": "Start each bullet with verbs like 'achieved', 'led'..."
      }
    ],
    "suggestions": [
      {
        "type": "content_optimization",
        "title": "Optimize Content with Metrics",
        "description": "Strengthen bullet points by adding quantifiable achievements...",
        "priority": 8,
        "example": "Instead of 'Managed a team'..."
      }
    ],
    "strengths": [
      "Detailed work experience with comprehensive descriptions",
      "Well-balanced skills section with relevant competencies"
    ],
    "weaknesses": [
      "Multiple content issues detected (5 instances)"
    ],
    "analysisMetadata": {
      "analyzerVersion": "1.0.0",
      "analysisDate": "2024-11-14T10:30:00.000Z",
      "processingTimeMs": 234
    }
  }
}
```

### Retrieve Analysis

```http
GET /api/cv/:cvId/analysis?limit=5&offset=0
```

**Query Parameters:**
- `limit` (default: 5) - Number of history items to return
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "latest": {
      "analysisId": "507f1f77bcf86cd799439011",
      "cvId": "507f1f77bcf86cd799439012",
      "parsedDataId": "507f1f77bcf86cd799439013",
      "version": 2,
      "scoreBreakdown": { /* ... */ },
      "issues": [ /* ... */ ],
      "suggestions": [ /* ... */ ],
      "strengths": [ /* ... */ ],
      "weaknesses": [ /* ... */ ],
      "targetJobMatch": null,
      "analysisMetadata": { /* ... */ }
    },
    "history": [
      {
        "analysisId": "507f1f77bcf86cd799439011",
        "version": 2,
        "overallScore": 72,
        "analysisDate": "2024-11-14T10:30:00.000Z",
        "createdAt": "2024-11-14T10:30:00.000Z"
      },
      {
        "analysisId": "507f1f77bcf86cd799439010",
        "version": 1,
        "overallScore": 65,
        "analysisDate": "2024-11-13T15:20:00.000Z",
        "createdAt": "2024-11-13T15:20:00.000Z"
      }
    ],
    "pagination": {
      "total": 2,
      "limit": 5,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

## Testing

### Unit Test Structure

Tests are located in `src/tests/cv-analysis.test.ts`:

```typescript
describe('CvAnalysisService', () => {
  describe('detectIssues', () => {
    it('should detect missing summary', () => { /* ... */ });
    it('should detect sparse experience', () => { /* ... */ });
    it('should detect weak action verbs', () => { /* ... */ });
  });
  
  describe('calculateScores', () => {
    it('should calculate correct overall score', () => { /* ... */ });
    it('should apply formatting penalties', () => { /* ... */ });
  });
  
  describe('generateSuggestions', () => {
    it('should prioritize critical issues', () => { /* ... */ });
  });
});
```

Run tests:
```bash
npm test                        # Run all tests
npm test cv-analysis           # Run analysis tests only
npm test -- --coverage         # With coverage report
```

## Performance Considerations

- **Deterministic Analysis**: All rule-based checks run in O(n) time relative to CV content size
- **Typical Processing Time**: 100-500ms for standard CVs
- **Memory Usage**: Minimal - analysis operates on already-parsed data structures
- **Scalability**: Can handle thousands of analyses per minute on standard hardware

## Versioning

The analyzer version is tracked in `analysisMetadata.analyzerVersion`. Increment when:
- Adding new rule evaluators
- Changing scoring weights significantly
- Modifying calculation algorithms

```typescript
// Update in src/config/analysisWeights.ts
export const ANALYZER_VERSION = '1.1.0';  // Increment here
```

This enables tracking which version produced each analysis, useful for A/B testing improvements.

## Monitoring & Logging

Key log events:
- Analysis start/completion (with timing)
- Parsing triggered (if no parsed data exists)
- Analysis failures (with error details)
- Score distribution (for quality tracking)

Example log entry:
```json
{
  "level": "info",
  "cvId": "507f1f77bcf86cd799439012",
  "analysisId": "507f1f77bcf86cd799439011",
  "score": 72,
  "issuesCount": 8,
  "processingTimeMs": 234,
  "msg": "CV analyzed successfully"
}
```

## Future Enhancements

Potential improvements to consider:

1. **Job-Specific Analysis**: Pass target job description, extract keywords, calculate match score
2. **Industry Templates**: Different scoring weights for tech/finance/healthcare/etc.
3. **Multi-Language Support**: Detect CV language, apply language-specific rules
4. **Historical Trend Analysis**: Track score improvements over time
5. **Batch Analysis**: Analyze multiple CVs in parallel for comparison
6. **Custom Rules Engine**: Allow users to define custom rules via configuration
7. **Machine Learning**: Train models on recruiter feedback to refine heuristics

## Troubleshooting

### Analysis Fails with "No parsed data found"

**Cause**: CV was uploaded but parsing hasn't completed yet.

**Solution**: The service automatically triggers parsing if needed. If this fails, check:
- Parsing service logs
- CV file is accessible at stored path
- PDF is readable (not corrupted or password-protected)

### Scores seem too high/low

**Cause**: Weights or thresholds may not align with your use case.

**Solution**: Adjust weights in `src/config/analysisWeights.ts` and test with sample CVs.

### Missing issues you expect to catch

**Cause**: Rule may not exist or threshold too lenient.

**Solution**: Add a custom rule evaluator (see Extension Points above).

## Support

For questions or feature requests:
1. Check this documentation first
2. Review test cases for usage examples
3. Inspect analyzer version and configuration in use
4. Contact the development team with specific analysis examples
