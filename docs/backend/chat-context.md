# Chat Context Building Strategy

This document describes how CV data is injected into chat prompts and how conversation history is maintained in the Pathwise chat integration.

## Overview

The chat integration uses Groq's LLM API to provide AI-powered resume assistance. The system builds rich context from CV metadata, parsed data, and analysis insights, then combines this with conversation history to provide relevant, personalized advice.

## Architecture

### Components

1. **GroqService** (`src/services/groqService.ts`)
   - Handles all communication with Groq API
   - Implements retry logic with exponential backoff
   - Supports both streaming and non-streaming responses
   - Validates API keys and normalizes errors

2. **ChatContextBuilder** (`src/services/chatContextBuilder.ts`)
   - Compiles CV data into structured system prompts
   - Manages token budgets and truncation
   - Prioritizes essential information

3. **ChatMessage Model** (`src/models/ChatMessage.ts`)
   - Persists conversation state in MongoDB
   - Indexes by `cvId` and `conversationId` for efficient retrieval
   - Stores system, user, and assistant messages with timestamps
   - Includes helper methods for trimming and retrieving history

4. **Chat Controller** (`src/controllers/chatController.ts`)
   - Orchestrates chat requests
   - Applies rate limiting and input sanitization
   - Manages conversation persistence

## Context Building Strategy

### Token Budget Management

The system uses a default maximum token budget of **6,000 tokens** for the system prompt. This leaves adequate room for conversation history and user messages within typical model context windows (e.g., 8K, 32K, or 128K tokens).

Token estimation uses an approximate ratio of **4 characters per token**, which is conservative for English text and provides a safety margin.

### Context Structure

The system prompt is built from the following sections, in priority order:

1. **Role Definition** (Always included)
   - Defines the AI's persona as an experienced technical recruiter and career advisor
   - Sets expectations for response style (actionable, specific, empathetic)

2. **CV Metadata** (Always included)
   - Original filename
   - Upload date
   - Processing status
   - Version information
   - Labels/tags

3. **Parsed Resume Data** (Included if available)
   - **Profile**: Name, contact info, links, summary
   - **Work Experience**: Companies, positions, dates, key highlights (limited to top 3 per role)
   - **Education**: Degrees, institutions, GPA, dates
   - **Skills**: Categorized skill lists
   - **Projects**: Top 5 projects with descriptions and technologies
   - **Certifications**: All certifications with issuers
   - **Languages**: Language proficiencies
   - **Raw Text**: Optional (disabled by default to save tokens)

4. **Analysis Insights** (Included if available)
   - **Score Breakdown**: Overall, formatting, content, keywords, structure, ATS compatibility
   - **Strengths**: Top identified strengths
   - **Weaknesses**: Areas for improvement
   - **Key Issues**: Critical and warning-level issues (top 5)
   - **Top Suggestions**: Prioritized recommendations (top 5)
   - **Target Job Match**: If applicable, shows matching/missing keywords and match score

5. **Response Guidelines** (Always included)
   - Instructions for formatting responses
   - Examples of good practices
   - Reminders about ATS compatibility and industry standards

### Truncation Strategy

When the assembled context exceeds the token budget:

1. **Essential sections are preserved**:
   - Role definition
   - CV metadata
   - Response guidelines

2. **Optional sections are added iteratively**:
   - Analysis insights (highest priority)
   - Work experience and education
   - Skills and projects
   - Certifications and languages

3. **If truncation is still needed**:
   - Content is sliced at the character level to fit within the budget
   - A marker `[Context truncated to fit token limit]` is appended

### Prioritization Heuristics

- **Critical issues** and **warnings** from analysis take precedence over informational items
- **Recent work experience** is more important than older entries
- **Top-priority suggestions** (priority 8-10) are included before lower-priority ones
- **Skills and keywords** are condensed but always included (essential for ATS discussion)

## Conversation History Management

### Storage

- Each message is stored as a separate `ChatMessage` document
- Messages are keyed by `cvId` + `conversationId`
- Three roles are supported: `system`, `user`, `assistant`
- Metadata tracks token usage, response time, and model used

### Retrieval and Trimming

To prevent context overflow, conversation history is limited:

- **Recent messages**: Up to 10 most recent user/assistant exchanges are included
- **System messages**: Always retained (contain CV context)
- **Oldest messages**: Automatically dropped when limit is exceeded

Helper methods in the `ChatMessage` model:
- `trimConversationHistory(cvId, conversationId, maxMessages)`: Trims to the most recent N messages
- `getRecentMessages(cvId, conversationId, limit)`: Fetches recent messages in chronological order
- `getConversation(cvId, conversationId)`: Retrieves all messages for a conversation

### Message Flow

1. User sends a message via `POST /api/chat`
2. System builds a fresh context prompt from the latest CV data
3. System retrieves the last 10 user/assistant messages
4. A new `system` message is saved (even though not shown to users, it tracks context)
5. The user's message is saved
6. All messages are combined and sent to Groq
7. The assistant's response is saved
8. Response is streamed or returned as JSON

### Streaming vs. Non-Streaming

- **Streaming** (default): Uses Server-Sent Events (SSE) to stream response chunks
  - More responsive UX
  - Lower perceived latency
  - Message is saved after stream completes
  
- **Non-Streaming**: Returns complete response as JSON
  - Simpler client implementation
  - Includes full metadata in response

## Rate Limiting and Security

### Rate Limiters

1. **IP-based rate limiting**:
   - Uses `rate-limiter-flexible` with in-memory storage
   - Default: 100 requests per 15-minute window
   - Configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`

2. **CV-based rate limiting**:
   - 20 messages per CV per minute
   - Prevents abuse of a single CV
   - Lighter than IP-based limit to allow legitimate use

### Input Sanitization

User messages are sanitized to:
- Trim leading/trailing whitespace
- Remove control characters (except newlines, tabs, carriage returns)
- Limit message length to 5,000 characters

### Jailbreak Detection

Basic pattern matching detects common prompt injection attempts:
- "Ignore all previous instructions"
- "You are now a [role]"
- "Disregard previous rules"
- System-level override attempts

Detected attempts are logged and rejected with a generic error message.

## Error Handling

### Groq Service Errors

- **API key validation**: Checked at service initialization
- **Retry logic**: Up to 3 retries with exponential backoff for transient errors (429, 500, 502, 503)
- **Timeout handling**: Configurable timeouts (default 30s for completion, 60s for streaming)
- **Error normalization**: All errors wrapped in `GroqServiceError` with status codes

### Controller Error Handling

- **Missing CV**: Returns 404 with descriptive message
- **Unparsed CV**: Returns 400 advising user to wait for parsing
- **Validation errors**: Returns 400 with Zod validation messages
- **Rate limit exceeded**: Returns 429 with retry-after guidance
- **Groq failures**: Returns 500 with generic error (details logged server-side)

## API Endpoints

### POST /api/chat

Send a chat message and receive an AI response.

**Request Body:**
```json
{
  "cvId": "64abc123...",
  "conversationId": "conv-2024-01-15-001",
  "message": "How can I improve my work experience section?",
  "stream": true
}
```

**Response (streaming):**
```
data: {"content": "Based"}
data: {"content": " on"}
data: {"content": " your"}
...
data: [DONE]
```

**Response (non-streaming):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-2024-01-15-001",
    "message": "Based on your resume...",
    "metadata": {
      "tokensUsed": 245,
      "model": "llama-3.1-70b-versatile",
      "responseTimeMs": 1523
    }
  }
}
```

### GET /api/chat/history/:cvId

Retrieve all conversations for a CV.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "conversationId": "conv-2024-01-15-001",
        "messageCount": 8,
        "lastMessage": "That's a great approach!",
        "lastMessageAt": "2024-01-15T14:32:10.000Z",
        "firstMessageAt": "2024-01-15T14:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### GET /api/chat/conversation/:cvId/:conversationId

Retrieve all messages in a specific conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-2024-01-15-001",
    "messages": [
      {
        "id": "64xyz...",
        "role": "user",
        "content": "How can I improve my work experience section?",
        "createdAt": "2024-01-15T14:20:00.000Z",
        "metadata": {}
      },
      {
        "id": "64abc...",
        "role": "assistant",
        "content": "Based on your resume...",
        "createdAt": "2024-01-15T14:20:03.000Z",
        "metadata": {
          "tokensUsed": 245,
          "responseTimeMs": 1523
        }
      }
    ]
  }
}
```

## Configuration

Environment variables (in `backend/.env`):

```bash
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_MAX_TOKENS=2048
GROQ_TEMPERATURE=0.7

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Future Enhancements

- **Redis-backed rate limiting** for distributed deployments
- **Conversation summarization** for very long conversations to fit more history into context
- **Fine-tuned prompt templates** per industry or CV type
- **User feedback loop** to improve response quality
- **Multi-language support** with language detection
- **Caching** of system prompts for the same CV version to reduce computation
