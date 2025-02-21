"use client";

import { useState } from "react";
import { uploadVideo } from "@/services/api";

export default function VideoUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a video file");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            await uploadVideo(file);
            setFile(null);
            window.location.reload();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to upload video"
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex flex-col gap-4">
                <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={`px-4 py-2 rounded-lg text-white font-medium
                        ${
                            !file || uploading
                                ? "bg-gray-400"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                >
                    {uploading ? "Uploading..." : "Upload Video"}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
        </div>
    );
}
