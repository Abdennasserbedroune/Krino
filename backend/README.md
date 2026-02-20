# Pathwise Backend (TypeScript/Node.js)

Modern TypeScript backend service for the Pathwise resume analysis platform, built with Express, MongoDB, and AI-powered analysis capabilities.

## 🚀 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod for runtime type validation
- **AI Integration**: Groq API for resume analysis
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Logging**: Pino (structured logging)
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (env validation, database)
│   ├── routes/          # Express route definitions
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic layer
│   ├── models/          # Mongoose schemas and models
│   ├── middleware/      # Express middleware (auth, logging, error handling)
│   ├── utils/           # Utility functions and helpers
│   ├── types/           # TypeScript type definitions
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── python-legacy/       # Archived FastAPI implementation
├── dist/                # Compiled JavaScript output (gitignored)
├── uploads/             # File upload directory (gitignored)
├── tsconfig.json        # TypeScript configuration
├── eslint.config.mjs    # ESLint configuration
├── .prettierrc          # Prettier configuration
└── package.json         # NPM dependencies and scripts
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18.x
- MongoDB (local or cloud instance)
- Groq API key

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in the required values:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your configuration**:
   ```env
   # Required
   MONGODB_URI=mongodb://localhost:27017/pathwise
   GROQ_API_KEY=your_groq_api_key_here
   
   # Optional (defaults provided)
   NODE_ENV=development
   PORT=8000
   CORS_ORIGIN=http://localhost:3000
   ```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode (development/production/test) |
| `PORT` | No | `8000` | Server port |
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `FILE_STORAGE_ROOT` | No | `./uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum file upload size in MB |
| `ALLOWED_FILE_TYPES` | No | `application/pdf,...` | Comma-separated MIME types |
| `GROQ_API_KEY` | **Yes** | - | API key for Groq AI service |
| `GROQ_MODEL` | No | `llama-3.1-70b-versatile` | Groq model to use |
| `GROQ_MAX_TOKENS` | No | `2048` | Max tokens for AI responses |
| `GROQ_TEMPERATURE` | No | `0.7` | AI model temperature (0-1) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `JWT_SECRET` | No | - | Secret for JWT signing (future use) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiration time |

## 📜 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production server |
| `npm run lint` | Lint code with ESLint (fails on warnings) |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Type-check without emitting files |
| `npm test` | Run tests (TODO: implement) |

## 🚦 Development Workflow

1. **Start development server**:
   ```bash
   npm run dev
   ```
   Server will start on `http://localhost:8000` with hot reload enabled.

2. **Check health endpoint**:
   ```bash
   curl http://localhost:8000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "uptime": 45.123,
     "database": "connected",
     "environment": "development"
   }
   ```

3. **Run linting**:
   ```bash
   npm run lint
   ```

4. **Format code**:
   ```bash
   npm run format
   ```

5. **Type-check**:
   ```bash
   npm run typecheck
   ```

## 🏗️ Production Build

```bash
npm run build
npm start
```

## 🔒 Security Features

- **Helmet**: Security headers middleware
- **CORS**: Configurable cross-origin resource sharing
- **Environment validation**: Zod schema validation for all env vars
- **Rate limiting**: Configurable request rate limits (ready to implement)
- **Input validation**: Zod schemas for request validation
- **Error handling**: Centralized error handling with proper logging

## 📝 API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns server health status, database connection, uptime
  - No authentication required
  - Used by monitoring and load balancers

### CV Upload
- **POST** `/api/cv/upload`
  - Uploads a CV/resume file for analysis
  - **Content-Type**: `multipart/form-data`
  - **Request Body**:
    - `cv` (file, required): PDF file to upload (max 10MB by default)
    - `userId` (string, required): User identifier
    - `labels` (string, optional): Comma-separated labels (e.g., "software engineer, senior, remote")
  
  - **Success Response** (201 Created):
    ```json
    {
      "success": true,
      "data": {
        "cvId": "507f1f77bcf86cd799439011",
        "userId": "user-123",
        "status": "uploaded",
        "version": 1,
        "metadata": {
          "originalFilename": "resume.pdf",
          "mimeType": "application/pdf",
          "fileSize": 245678,
          "uploadedAt": "2024-01-15T10:30:00.000Z",
          "checksum": "a3b2c1d4e5..."
        },
        "labels": ["software engineer", "senior"]
      }
    }
    ```
  
  - **Error Responses**:
    - `400 Bad Request`: Missing file, invalid file type, or file too large
      ```json
      {
        "status": "error",
        "message": "Invalid file type. Only application/pdf are allowed."
      }
      ```
    - `500 Internal Server Error`: Server-side processing error
  
  - **File Storage**:
    - Files are stored at: `{FILE_STORAGE_ROOT}/cv/{cvId}/original-v{version}.pdf`
    - Each upload is versioned and tracked with checksums
    - Temp files are automatically cleaned up after processing
  
  - **Upload Workflow**:
    1. File uploaded via multipart/form-data
    2. Multer middleware validates file type and size
    3. File temporarily stored in `{FILE_STORAGE_ROOT}/temp/`
    4. Metadata validated with Zod schema
    5. CV document created in MongoDB with status `uploaded`
    6. File moved to permanent storage: `{FILE_STORAGE_ROOT}/cv/{cvId}/original-v1.pdf`
    7. Checksum (SHA-256) calculated and stored
    8. Version history updated
    9. Temp file cleaned up
    10. Response returned with CV metadata
  
  - **cURL Example**:
    ```bash
    curl -X POST http://localhost:8000/api/cv/upload \
      -F "cv=@/path/to/resume.pdf" \
      -F "userId=user-123" \
      -F "labels=software engineer, senior"
    ```

## 📚 API Documentation

Comprehensive documentation is available in the `docs/backend/` directory:

- **[API Contract](docs/backend/api-contract.md)** - Complete endpoint reference with request/response schemas, rate limits, and sample payloads
- **[Error Handling Guide](docs/backend/error-handling.md)** - Error taxonomy, retry strategies, logging patterns, and troubleshooting

### Quick API Reference

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/health` | GET | Global | Health check |
| `/api/cv/upload` | POST | 10/hour | Upload CV file |
| `/api/cv/:cvId` | GET | Global | Get CV details |
| `/api/cv/:cvId/analyze` | POST | 20/hour | Run AI analysis |
| `/api/cv/:cvId/analysis` | GET | Global | Get analysis results |
| `/api/cv/:cvId/generate` | POST | 20/hour | Generate improved CV |
| `/api/cv/:cvId/download` | GET | Global | Download CV file |
| `/api/chat` | POST | 30/min | Send chat message |
| `/api/chat/history/:cvId` | GET | Global | Get chat history |

### Error Response Structure

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [...],
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/api/cv/upload",
    "requestId": "req-123"
  }
}
```

### Rate Limiting

Rate limits are enforced per IP address and include informative headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2025-01-15T10:31:00.000Z
Retry-After: 60 (on 429 responses)
```

Rate limits are configurable via environment variables (see `.env.example`).

## 🧪 Testing

Integration tests are implemented using Jest, Supertest, and MongoDB Memory Server.

**Run all tests with coverage**:
```bash
npm test
```

**Run tests in watch mode**:
```bash
npm run test:watch
```

**Run integration tests only**:
```bash
npm run test:integration
```

**Test Coverage**:
- CV upload with valid PDF files
- Rejection of non-PDF files
- Rejection of oversized files
- Validation of required fields (Zod schemas)
- Invalid payloads and malformed requests
- Missing resources (404 errors)
- Rate limit enforcement (429 errors)
- Consistent error response structure
- Request ID propagation
- File integrity (checksum verification)
- Storage directory structure
- Cleanup of temporary files

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify `MONGODB_URI` is correct in `.env`
- Ensure MongoDB is running locally or cloud instance is accessible
- Check network connectivity and firewall rules

### Port Already in Use
- Change `PORT` in `.env` to an available port
- Kill process using default port: `lsof -ti:8000 | xargs kill`

### Environment Variable Errors
- Ensure all required variables are set in `.env`
- Check for typos in variable names
- Review console output for specific missing variables

## 📦 Legacy Python Backend

The previous FastAPI implementation has been archived in `python-legacy/` for reference. The new TypeScript implementation provides:
- Stronger type safety with TypeScript
- Better IDE support and developer experience
- Unified JavaScript/TypeScript stack with frontend
- Modern async/await patterns
- Improved error handling and logging

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Run `npm run lint` before committing
3. Ensure `npm run typecheck` passes
4. Format code with `npm run format`
5. Write descriptive commit messages

## 📄 License

ISC
