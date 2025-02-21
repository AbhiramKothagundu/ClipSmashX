"use client";

import { useEffect, useState } from "react";
import { getVideos } from "@/services/api";
import VideoActions from "./VideoActions";
import VideoMerge from "./VideoMerge";

interface Video {
    id: number;
    title: string;
    path: string;
    duration: number;
    created_at: string;
}

export default function VideoList() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVideos = async () => {
        try {
            const data = await getVideos();
            setVideos(data);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to fetch videos"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-8">
            <VideoMerge videos={videos} onSuccess={fetchVideos} />
            <div className="grid gap-4 p-4">
                {videos.length === 0 ? (
                    <p className="text-center text-gray-500">
                        No videos uploaded yet
                    </p>
                ) : (
                    videos.map((video) => (
                        <div
                            key={video.id}
                            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                        >
                            <h3 className="font-medium text-lg">
                                {video.title}
                            </h3>
                            <div className="text-sm text-gray-500">
                                <p>Duration: {video.duration} seconds</p>
                                <p>
                                    Uploaded:{" "}
                                    {new Date(
                                        video.created_at
                                    ).toLocaleString()}
                                </p>
                            </div>
                            <video
                                className="mt-2 w-full rounded"
                                controls
                                src={`http://localhost:3000/${video.path}`}
                                onError={(e) => {
                                    console.error("Video load error:", e);
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = "none";
                                }}
                            />
                            <VideoActions
                                video={video}
                                onSuccess={fetchVideos}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
