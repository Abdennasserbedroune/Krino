# Chat Integration - Implementation Summary

## Overview

This document provides a quick summary of the chat integration implementation for the Pathwise resume analysis platform.

## Components Implemented

### 1. Groq Service (`src/services/groqService.ts`)
- **Purpose**: Wrapper for Groq API communication
- **Features**:
  - API key validation
  - Automatic retry with exponential backoff (up to 3 attempts)
  - Streaming and non-streaming completion support
  - Configurable timeout handling
  - Normalized error responses

### 2. Chat Context Builder (`src/services/chatContextBuilder.ts`)
- **Purpose**: Compile CV data into bounded-length system prompts
- **Features**:
  - Builds structured prompts from CV metadata, parsed data, and analysis
  - Token budget management (default 6,000 tokens)
  - Intelligent truncation with section prioritization
  - Token estimation utility

### 3. Chat Message Model (`src/models/ChatMessage.ts`)
- **Purpose**: Persist conversational state
- **Features**:
  - Stores system/user/assistant messages
  - Indexed by `cvId` + `conversationId`
  - Helper methods for trimming and retrieving history
  - Tracks metadata (tokens used, response time, model)

### 4. Chat Controller (`src/controllers/chatController.ts`)
- **Purpose**: Orchestrate chat requests and responses
- **Features**:
  - Handles message sending with streaming/non-streaming options
  - Retrieves conversation history with pagination
  - Fetches individual conversation messages
  - Validates inputs and handles errors

### 5. Rate Limiting Middleware (`src/middleware/rateLimiter.ts`)
- **Purpose**: Prevent abuse and ensure fair usage
- **Features**:
  - IP-based rate limiting (100 req/15min by default)
  - CV-based rate limiting (20 req/min per CV)
  - Input sanitization (removes control characters)
  - Basic jailbreak detection

### 6. Chat Routes (`src/routes/chat.ts`)
- **Purpose**: Define API endpoints
- **Endpoints**:
  - `POST /api/chat` - Send a chat message
  - `GET /api/chat/history/:cvId` - Get conversations for a CV
  - `GET /api/chat/conversation/:cvId/:conversationId` - Get messages in a conversation

### 7. Tests
- **chat.test.ts**: End-to-end API tests covering all endpoints and edge cases
- **groq-service.test.ts**: Unit tests for Groq service including retries and streaming
- **chat-context-builder.test.ts**: Tests for context building, truncation, and token estimation

## API Examples

### Send a Chat Message (Streaming)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "cvId": "64abc123...",
    "conversationId": "conv-2024-01-15-001",
    "message": "How can I improve my work experience section?",
    "stream": true
  }'
```

Response (SSE):
```
data: {"content": "Based"}
data: {"content": " on"}
...
data: [DONE]
```

### Send a Chat Message (Non-Streaming)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "cvId": "64abc123...",
    "conversationId": "conv-2024-01-15-001",
    "message": "What are my resume strengths?",
    "stream": false
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-2024-01-15-001",
    "message": "Based on the analysis...",
    "metadata": {
      "tokensUsed": 245,
      "model": "llama-3.1-70b-versatile",
      "responseTimeMs": 1523
    }
  }
}
```

### Get Conversation History

```bash
curl http://localhost:8000/api/chat/history/64abc123?page=1&limit=10
```

### Get Conversation Messages

```bash
curl http://localhost:8000/api/chat/conversation/64abc123/conv-2024-01-15-001
```

## Configuration

Environment variables in `backend/.env`:

```bash
GROQ_API_KEY=gsk_...                      # Required
GROQ_MODEL=llama-3.1-70b-versatile        # Default model
GROQ_MAX_TOKENS=2048                      # Max completion tokens
GROQ_TEMPERATURE=0.7                      # LLM temperature

RATE_LIMIT_WINDOW_MS=900000               # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100               # Max requests per window
```

## Testing

Run all chat-related tests:
```bash
npm test -- chat.test.ts
npm test -- groq-service.test.ts
npm test -- chat-context-builder.test.ts
```

Run all tests:
```bash
npm test
```

## Rate Limiting

- **IP-based**: 100 requests per 15-minute window
- **CV-based**: 20 messages per CV per minute
- Exceeding limits returns `429 Too Many Requests`

## Security Features

1. **Input Sanitization**: Removes control characters and limits message length
2. **Jailbreak Detection**: Basic pattern matching for prompt injection attempts
3. **Validation**: Zod schemas for all inputs
4. **Error Handling**: Descriptive errors without exposing internals

## Error Responses

- `400` - Validation error, missing CV data, or invalid input
- `404` - CV not found
- `429` - Rate limit exceeded
- `500` - Internal server error (Groq failures, etc.)

## Documentation

- **Detailed Strategy**: `docs/backend/chat-context.md`
- **API Documentation**: Included in this file
- **Code Comments**: Inline documentation in source files

## Future Enhancements

- Redis-backed rate limiting for multi-instance deployments
- Conversation summarization for long histories
- Fine-tuned prompts per industry
- Multi-language support
- Enhanced analytics and monitoring
