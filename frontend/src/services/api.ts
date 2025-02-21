const API_URL = "http://localhost:3000/api";
const API_TOKEN = "video_api_secret_token_123";

export const uploadVideo = async (file: File) => {
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch(`${API_URL}/videos/upload`, {
            method: "POST",
            headers: {
                Authorization: API_TOKEN,
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        throw error;
    }
};

export const getVideos = async () => {
    try {
        const response = await fetch(`${API_URL}/videos`, {
            headers: {
                Authorization: API_TOKEN,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data.videos;
    } catch (error) {
        throw error;
    }
};
