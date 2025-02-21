// Create a mock function for setFfmpegPath
const setFfmpegPath = jest.fn();

// Create the main mock function
const mockFfmpeg = jest.fn().mockReturnValue({
    setStartTime: jest.fn().mockReturnThis(),
    setDuration: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function (event, callback) {
        if (event === "end") {
            callback();
        }
        return this;
    }),
    run: jest.fn().mockImplementation(function () {
        // Simulate successful completion
        this.on("end")();
    }),
    setFfmpegPath: jest.fn(),
    outputOptions: jest.fn().mockReturnThis(),
    input: jest.fn().mockReturnThis(),
});

// Add setFfmpegPath to the main function
mockFfmpeg.setFfmpegPath = setFfmpegPath;

module.exports = mockFfmpeg;
