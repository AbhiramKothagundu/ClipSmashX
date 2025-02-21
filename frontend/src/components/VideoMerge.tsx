"use client";

import { useState } from "react";
import { mergeVideos } from "@/services/api";

interface VideoMergeProps {
    videos: Array<{ id: number; title: string }>;
    onSuccess: () => void;
}

export default function VideoMerge({ videos, onSuccess }: VideoMergeProps) {
    const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMerge = async () => {
        if (selectedVideos.length < 2) {
            setError("Select at least 2 videos to merge");
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);
            await mergeVideos(selectedVideos);
            setSelectedVideos([]);
            onSuccess();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to merge videos"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleVideoSelection = (id: number) => {
        setSelectedVideos((prev) =>
            prev.includes(id)
                ? prev.filter((videoId) => videoId !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Merge Videos</h2>
            <div className="space-y-4">
                <div className="grid gap-2">
                    {videos.map((video) => (
                        <label
                            key={video.id}
                            className="flex items-center space-x-2"
                        >
                            <input
                                type="checkbox"
                                checked={selectedVideos.includes(video.id)}
                                onChange={() => toggleVideoSelection(video.id)}
                                className="rounded text-blue-600"
                            />
                            <span>{video.title}</span>
                        </label>
                    ))}
                </div>
                <button
                    onClick={handleMerge}
                    disabled={isProcessing || selectedVideos.length < 2}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isProcessing ? "Processing..." : "Merge Selected Videos"}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
        </div>
    );
}
