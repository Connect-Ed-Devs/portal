'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChevronRight, Pizza } from 'lucide-react';
import Navigation from '@/app/components/Navigation';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Show loading while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    // Don't render anything if redirecting
    if (!user) {
        return null;
    }


    return (
        <div className="min-h-screen bg-background">
            <Navigation title="Connect-Ed Portal" />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                    {/* Manage Menus Button */}
                    <button
                        onClick={() => router.push('/home/menu')}
                        className="group relative w-full max-w-md h-16 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                    >
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        {/* Button content */}
                        <div className="relative flex items-center justify-center h-full px-8">
                            <div className="flex items-center space-x-3">
                                <Pizza className="h-5 w-5 text-white" />
                                <span className="text-xl font-semibold text-white tracking-wide">
                                    Manage Menus
                                </span>
                                <div className="p-1 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300 group-hover:translate-x-1">
                                    <ChevronRight className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Shimmer effect */}
                        <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-out"></div>
                    </button>
                </div>
            </main>
        </div>
    );
}