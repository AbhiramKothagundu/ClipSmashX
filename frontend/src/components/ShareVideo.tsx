"use client";

import { useState } from "react";
import { generateShareLink } from "@/services/api";

interface ShareVideoProps {
    videoId: number;
}

interface ShareResponse {
    shareable_link: string;
    frontend_link: string;
    expires_at: string;
    expires_in: string;
}

export default function ShareVideo({ videoId }: ShareVideoProps) {
    const [shareData, setShareData] = useState<ShareResponse | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiryHours, setExpiryHours] = useState("24");

    const handleShare = async () => {
        try {
            setIsGenerating(true);
            setError(null);
            const data = await generateShareLink(videoId, Number(expiryHours));
            setShareData(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to generate share link"
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <div className="flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Expires after (hours)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="168"
                        value={expiryHours}
                        onChange={(e) => setExpiryHours(e.target.value)}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm"
                    />
                </div>
                <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isGenerating ? "Generating..." : "Generate Share Link"}
                </button>
            </div>
            {shareData && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                            Frontend Link:
                        </p>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={shareData.frontend_link}
                                readOnly
                                className="flex-1 px-3 py-2 border rounded-md"
                            />
                            <button
                                onClick={() =>
                                    navigator.clipboard.writeText(
                                        shareData.frontend_link
                                    )
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                            API Link:
                        </p>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={shareData.shareable_link}
                                readOnly
                                className="flex-1 px-3 py-2 border rounded-md"
                            />
                            <button
                                onClick={() =>
                                    navigator.clipboard.writeText(
                                        shareData.shareable_link
                                    )
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        Expires:{" "}
                        {new Date(shareData.expires_at).toLocaleString()} (
                        {shareData.expires_in})
                    </p>
                </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
}
