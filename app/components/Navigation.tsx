'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface NavigationProps {
    title: string;
    showBackButton?: boolean;
    backButtonPath?: string;
}

export default function Navigation({ title, showBackButton = false, backButtonPath = '/home' }: NavigationProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleBackClick = () => {
        router.push(backButtonPath);
    };

    return (
        <header className="border-b border-black/[.08] dark:border-white/[.145] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        {showBackButton && (
                            <button
                                onClick={handleBackClick}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 mr-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <Image src="/logo.jpg" alt={'Logo'} width={32} height={32} />
                        <div className="mr-1"></div>
                        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-foreground/60">
                            Welcome, {user?.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-foreground text-background px-4 py-2 rounded-md font-medium hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
