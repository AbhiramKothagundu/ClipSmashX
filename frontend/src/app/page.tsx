"use client";

import VideoUploader from "@/components/VideoUploader";
import VideoList from "@/components/VideoList";

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-8 text-center">
                    Video Upload App
                </h1>
                <div className="max-w-2xl mx-auto mb-8">
                    <VideoUploader />
                </div>
                <VideoList />
            </div>
        </main>
    );
}
