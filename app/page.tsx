"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown === 0) {
            router.replace("/login");
            return;
        }

        const timer = setTimeout(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex flex-col items-center justify-center gap-4 py-32 px-16 bg-white dark:bg-black rounded-xl">
                <Image
                    className="dark:invert"
                    src="/next.svg"
                    alt="Next.js logo"
                    width={100}
                    height={20}
                    priority
                />

                <p className="text-lg text-zinc-700 dark:text-zinc-300">
                    Redirecting to login in
                </p>

                <span className="text-4xl font-bold text-black dark:text-white">
                    {countdown}
                </span>
            </main>
        </div>
    );
}
