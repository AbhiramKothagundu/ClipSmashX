// Load mocks first
jest.mock("fs", () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

jest.mock("fluent-ffmpeg", () => require("../mocks/ffmpeg.mock"));
jest.mock("@ffmpeg-installer/ffmpeg", () => ({
    path: "mock/path/to/ffmpeg",
}));

// Then load the controller
const {
    uploadVideo,
    getVideos,
    trimVideo,
    mergeVideos,
    generateShareLink,
    getSharedVideo,
} = require("../../src/controllers/videoController");
const mockDb = require("../mocks/db.mock");
const fs = require("fs");
const path = require("path");

describe("Video Controller Unit Tests", () => {
    beforeAll(() => {
        global.db = mockDb;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("uploadVideo", () => {
        it("should upload video successfully", async () => {
            const req = {
                file: {
                    path: "uploads/test.mp4",
                    originalname: "test.mp4",
                },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            fs.existsSync.mockReturnValue(true);

            mockDb.run.mockImplementation((sql, params, callback) => {
                callback.call({ lastID: 1 });
            });

            await uploadVideo(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    video: expect.objectContaining({
                        id: 1,
                        title: "test.mp4",
                    }),
                })
            );
        });

        it("should handle missing file", async () => {
            const req = { file: null };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await uploadVideo(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: "No video file uploaded",
                })
            );
        });
    });

    describe("generateShareLink", () => {
        it("should generate share link successfully", async () => {
            const req = {
                params: { id: 1 },
                body: { hours: 48 },
                protocol: "http",
                get: jest.fn().mockReturnValue("localhost:3000"),
            };
            const res = {
                json: jest.fn(),
            };

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    title: "test.mp4",
                    path: "uploads/test.mp4",
                });
            });

            mockDb.run.mockImplementation((sql, params, callback) => {
                callback.call({ changes: 1 });
            });

            await generateShareLink(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    shareable_link: expect.any(String),
                    frontend_link: expect.any(String),
                })
            );
        });
    });

    describe("getVideos", () => {
        it("should return list of videos", async () => {
            const req = {};
            const res = {
                json: jest.fn(),
            };

            const mockVideos = [
                { id: 1, title: "video1.mp4", path: "uploads/video1.mp4" },
                { id: 2, title: "video2.mp4", path: "uploads/video2.mp4" },
            ];

            fs.existsSync.mockReturnValue(true);
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, mockVideos);
            });

            await getVideos(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                videos: mockVideos,
            });
        });

        it("should handle database errors", async () => {
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error("Database error"));
            });

            await getVideos(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                })
            );
        });
    });

    describe("trimVideo", () => {
        it("should trim video successfully", async () => {
            const req = {
                params: { id: 1 },
                body: { startTime: 0, endTime: 5 },
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    title: "test.mp4",
                    path: "uploads/test.mp4",
                    duration: 10,
                });
            });

            mockDb.run.mockImplementation((sql, params, callback) => {
                callback.call({ lastID: 2 });
            });

            await trimVideo(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    video: expect.objectContaining({
                        id: 2,
                    }),
                })
            );
        });

        it("should validate trim parameters", async () => {
            const req = {
                params: { id: 1 },
                body: { startTime: 5, endTime: 2 }, // Invalid: start > end
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            await trimVideo(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: expect.stringContaining(
                        "End time must be greater"
                    ),
                })
            );
        });
    });

    // Add more unit tests for other controller methods...
});
