# Video Processing API

A REST API service that handles video processing operations. Built with Node.js and Express, it provides endpoints for video upload, trimming, merging, and sharing capabilities. Includes a comprehensive test suite and Swagger documentation.

## Key Features

-   **Video Upload:** Support for large video files (up to 100MB)
-   **Video Processing:**
    -   Trim videos to specific durations
    -   Merge multiple videos into one
-   **Sharing System:**
    -   Generate time-limited share links
    -   Public access to shared videos
-   **Security:** API token authentication
-   **Documentation:** Interactive Swagger UI
-   **Testing:** Unit and E2E tests with ~90% coverage

## Project Structure

```
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── config/        # App configuration
│   │   ├── controllers/   # API logic
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   └── routes/        # API routes
│   ├── tests/
│   │   ├── e2e/          # API endpoint tests
│   │   ├── unit/         # Unit tests
│   │   └── mocks/        # Test mocks & fixtures
│   ├── uploads/          # Uploaded videos storage
│   └── database.db       # SQLite database
└── frontend/             # Next.js frontend
    ├── src/
    │   ├── app/          # Pages & routes
    │   └── components/   # React components
    └── public/           # Static assets
```

## Prerequisites

-   Node.js v18 or higher
-   FFmpeg v4.4 or higher
-   SQLite3 v3.x
-   Git v2.x
-   Storage: At least 1GB free space
-   Memory: Minimum 512MB RAM

## Setup and Development

### Installation

1. Clone the repository:

```bash
git clone https://github.com/AbhiramKothagundu/video-rest-api.git
cd video-processing-api
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Create environment file (backend/.env):

```ini
# Required
PORT=3000                         # API server port
API_TOKEN=your_secret_token      # Auth token for API access

# Optional
SHARE_LINK_EXPIRY_HOURS=24      # Default share link validity
NODE_ENV=development            # Environment (development/production/test)
```

4. Create required directories:

```bash
mkdir -p backend/uploads
mkdir -p backend/tests/mocks/uploads
```

### Running the Server

Development mode (with auto-reload):

```bash
cd backend
npm run dev
```

Production mode:

```bash
cd backend
npm start
```

Server runs at: `http://localhost:3000`

### Development Tools

#### VS Code Extensions

-   ESLint
-   Prettier
-   SQLite Viewer

#### Code Style

-   Uses Prettier for formatting
-   ESLint for code quality
-   Jest for testing

## API Documentation

Swagger UI available at: `http://localhost:3000/api-docs`

### Authentication

All endpoints (except shared video access) require the API token:

```http
Authorization: video_api_secret_token_123
```

### Main Endpoints

-   `POST /api/videos/upload` - Upload video
-   `GET /api/videos` - List all videos
-   `POST /api/videos/:id/trim` - Trim video
-   `POST /api/videos/merge` - Merge videos
-   `POST /api/videos/:id/share` - Create share link
-   `GET /api/videos/share/:token` - Access shared video

### API Examples

Upload a video:

```bash
curl -X POST \
  -H "Authorization: video_api_secret_token_123" \
  -F "video=@./video.mp4" \
  http://localhost:3000/api/videos/upload
```

Trim a video:

```bash
curl -X POST \
  -H "Authorization: video_api_secret_token_123" \
  -H "Content-Type: application/json" \
  -d '{"startTime": 0, "endTime": 30}' \
  http://localhost:3000/api/videos/1/trim
```

Generate share link:

```bash
curl -X POST \
  -H "Authorization: video_api_secret_token_123" \
  -H "Content-Type: application/json" \
  -d '{"hours": 24}' \
  http://localhost:3000/api/videos/1/share
```

## Testing

Run all tests:

```bash
cd backend
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Test Coverage

-   Current coverage: ~90% statements
-   View report: `backend/coverage/lcov-report/index.html`

## Technical Details

### Database Schema

```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,          -- Original filename
    path TEXT NOT NULL,           -- File path in uploads directory
    duration INTEGER,             -- Video duration in seconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    share_token TEXT UNIQUE,      -- Random token for sharing
    expires_at DATETIME           -- Share link expiry time
);
```

### Upload Limits

```javascript
// backend/src/config/upload.js
{
    fileSize: 100 * 1024 * 1024,  // 100MB
    minDuration: 1,               // 1 second
    maxDuration: 3600             // 1 hour
}
```

### File Locations

-   **Uploaded videos:** `backend/uploads/`
-   **Database file:** `backend/database.db`
-   **Test files:** `backend/tests/mocks/uploads/`
-   **Test logs:** `backend/tests/logs/`
-   **Coverage report:** `backend/coverage/lcov-report/index.html`

## Troubleshooting

### Common Issues

1. FFmpeg not found:

    - Ensure FFmpeg is installed globally
    - Check PATH environment variable
    - Verify `ffmpeg` command works in terminal

2. Upload fails:

    - Check file size (max 100MB)
    - Verify uploads directory exists and is writable
    - Check video duration (1s - 1h)
    - Check available disk space

3. Tests fail:
    - Ensure test database is writable
    - Check FFmpeg installation
    - Verify test directories exist
    - Check test file permissions

## License

MIT License

Copyright (c) 2025 Abhiram Kothagundu

See the [LICENSE](LICENSE) file for details.

## Author

**Abhiram Kothagundu**
