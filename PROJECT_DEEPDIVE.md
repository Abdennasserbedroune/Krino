# Pathwise Project Deep Dive

## 1. Project Overview
Pathwise is an AI-powered CV analysis and improvement platform. It allows users to upload their CVs, receive instant AI-driven feedback, and generate improved versions of their resumes. The platform emphasizes a "brutalist" design aesthetic and privacy-focused local processing where possible.

## 2. Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Brutalist Design System)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Hooks + Context (Auth)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Authentication**: JWT (HS256)

### AI & Processing
- **LLM Provider**: Groq (`llama-3.1-70b-versatile`)
- **Local NLP**: spaCy (Entity Recognition), textstat (Readability)
- **OCR/Parsing**: pdf2image, pytesseract, pypdf

## 3. Architecture & Data Flow

### CV Processing Pipeline
1.  **Upload**: User uploads PDF/DOCX via `POST /api/v1/cv/upload`.
2.  **Validation**: Backend checks file type, size (5MB limit), and duplicates.
3.  **Local Parsing**:
    - Text is extracted using `pypdf` or `docx2txt`.
    - If text is sparse (scanned PDF), `pdf2image` + `pytesseract` (OCR) is used.
4.  **Local Analysis**:
    - **NLP**: `spaCy` extracts entities (Person, Org, Date).
    - **Metrics**: `textstat` calculates readability score and grade level.
    - **Scoring**: A heuristic score (0-100) is calculated based on content density and readability.
5.  **Structure Extraction**: Regex and rule-based logic extract structured data (Skills, Experience, Education).
6.  **AI Review (Groq)**:
    - The structured data and analysis results are sent to Groq.
    - Groq acts as a "Senior Recruiter" to provide qualitative feedback and suggestions.
7.  **Rewrite (Groq)**:
    - User can request a rewrite.
    - Groq generates an improved version of the CV based on the analysis.

### Authentication Flow
1.  **Sign Up/In**: User credentials sent to `/api/v1/auth/login`.
2.  **Token Issue**: Backend issues a JWT `access_token`.
3.  **Storage**: Frontend stores token in `localStorage` AND `document.cookie`.
4.  **Middleware**: Next.js Middleware protects `/dashboard` routes by checking the cookie.
5.  **API Requests**: Frontend attaches `Authorization: Bearer <token>` to all API calls.

## 4. Key Directories

### Backend (`/backend`)
-   `app/api`: API route handlers (endpoints).
-   `app/core`: Configuration, security, and middleware.
-   `app/db`: Database models (SQLAlchemy) and session management.
-   `app/services`: Business logic.
    -   `cv/parsing.py`: File parsing (PDF/OCR).
    -   `cv/analysis.py`: Local NLP analysis.
    -   `cv/structure.py`: Regex extraction.
    -   `ai/groq_client.py`: Groq API integration.
    -   `storage/file_storage.py`: Local file management.

### Frontend (`/frontend`)
-   `app/`: Next.js App Router pages.
    -   `auth/`: Sign In/Up pages.
    -   `dashboard/`: Protected user area (Upload, Analysis, Chat).
-   `components/`: Reusable UI components.
    -   `ui/`: Atomic components (Buttons, Inputs, Toast, Modal).
    -   `dashboard/`: Feature-specific components.
-   `lib/`: Utilities and API clients.
    -   `auth/`: Client-side auth logic.

## 5. Database Schema
-   **Users**: `id`, `email`, `hashed_password`, `full_name`.
-   **CVs**: `id`, `user_id`, `original_filename`, `file_path`, `extracted_text`, `structured_data` (JSON), `analysis_result` (JSON), `score`.

## 6. Recent Improvements
-   **File Management**: Added Delete functionality (DB + Filesystem) and Duplicate prevention.
-   **UI/UX**: Implemented Brutalist design, Profile Dropdown, Custom Toasts, and Modals.
-   **Navigation**: Improved Sign Out flow and added Home links to Auth pages.
-   **Robustness**: Added fallback mechanisms for analysis fetching and improved error handling.
