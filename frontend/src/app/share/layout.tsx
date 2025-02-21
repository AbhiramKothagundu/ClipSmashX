import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Shared Video",
    description: "Watch shared video",
};

export default function ShareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-gray-50" suppressHydrationWarning>
            {children}
        </main>
    );
}
