"use client";

import { useEffect, useState } from "react";
import { use } from "react";

interface SharedVideo {
    id: number;
    title: string;
    duration: number;
    url: string;
    created_at: string;
}

interface PageProps {
    params: Promise<{ token: string }>;
}

export default function SharedVideoPage({ params }: PageProps) {
    const { token } = use(params);
    const [video, setVideo] = useState<SharedVideo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await fetch(
                    `http://localhost:3000/api/videos/share/${token}`
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to fetch video");
                }

                setVideo(data.video);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load video"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl text-red-500">{error}</div>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Video not found</div>
            </div>
        );
    }

    return (
        <div className="py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <video
                        className="w-full"
                        controls
                        src={video.url}
                        onError={() => {
                            setError("Failed to load video");
                        }}
                    />
                    <div className="p-4">
                        <p className="text-gray-600">
                            Duration: {video.duration} seconds
                        </p>
                        <p className="text-gray-600">
                            Uploaded:{" "}
                            {new Date(video.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
