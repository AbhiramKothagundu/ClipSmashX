const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Set test environment
process.env.NODE_ENV = "test";

// Mock environment variables
process.env.API_TOKEN = "test_token";
process.env.SHARE_LINK_EXPIRY_HOURS = "24";

// Mock all external dependencies
jest.mock("fluent-ffmpeg", () => require("./mocks/ffmpeg.mock"));
jest.mock("@ffmpeg-installer/ffmpeg", () => ({
    path: "mock/path/to/ffmpeg",
}));
jest.mock("get-video-duration", () => require("./mocks/video-duration.mock"));
jest.mock("@ffprobe-installer/ffprobe", () => ({
    path: "mock/path/to/ffprobe",
}));

let testDb;

// Setup test database
beforeAll(async () => {
    testDb = new sqlite3.Database(":memory:");

    // Initialize the test database with required tables
    await new Promise((resolve, reject) => {
        testDb.serialize(() => {
            testDb.run(
                `
                CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    path TEXT NOT NULL,
                    duration INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    share_token TEXT UNIQUE,
                    expires_at DATETIME
                )
            `,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    global.db = testDb;
});

afterAll(async () => {
    if (testDb) {
        await new Promise((resolve) => testDb.close(resolve));
    }
});

// Silence console logs during tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
};

// Global beforeAll and afterAll hooks can be added here
