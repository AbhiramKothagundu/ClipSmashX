const API_URL = "http://localhost:3000/api";
const API_TOKEN = "video_api_secret_token_123";

// Common headers for all requests
const getHeaders = (includeContentType = true) => {
    const headers: Record<string, string> = {
        Authorization: API_TOKEN,
    };

    // Don't include Content-Type for FormData
    if (includeContentType) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
};

export const uploadVideo = async (file: File) => {
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch(`${API_URL}/videos/upload`, {
            method: "POST",
            headers: getHeaders(false), // Don't include Content-Type for FormData
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Upload failed");
        }

        return await response.json();
    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
};

export const getVideos = async () => {
    try {
        const response = await fetch(`${API_URL}/videos`, {
            headers: getHeaders(),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to fetch videos");
        }

        const data = await response.json();
        return data.videos;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};

export const trimVideo = async (
    videoId: number,
    startTime: number,
    endTime: number
) => {
    try {
        const response = await fetch(`${API_URL}/videos/${videoId}/trim`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: API_TOKEN,
            },
            body: JSON.stringify({ startTime, endTime }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        throw error;
    }
};

export const mergeVideos = async (videoIds: number[]) => {
    try {
        const response = await fetch(`${API_URL}/videos/merge`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: API_TOKEN,
            },
            body: JSON.stringify({ videoIds }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        throw error;
    }
};
