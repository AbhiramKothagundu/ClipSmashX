"use client";

import { useState } from "react";
import { trimVideo, mergeVideos } from "@/services/api";

interface VideoActionsProps {
    video: {
        id: number;
        duration: number;
    };
    onSuccess: () => void;
}

export default function VideoActions({ video, onSuccess }: VideoActionsProps) {
    const [startTime, setStartTime] = useState("0");
    const [endTime, setEndTime] = useState(video.duration.toString());
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTrim = async () => {
        try {
            setIsProcessing(true);
            setError(null);
            await trimVideo(video.id, Number(startTime), Number(endTime));
            onSuccess();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to trim video"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <div className="flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Start Time (seconds)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={video.duration}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        End Time (seconds)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={video.duration}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={handleTrim}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isProcessing ? "Processing..." : "Trim Video"}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
    );
}
