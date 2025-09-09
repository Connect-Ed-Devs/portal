'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChevronRight, Pizza, Icon } from 'lucide-react';
import { football } from '@lucide/lab';
import Navigation from '@/app/components/Navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { canManageFood, canManageSports, loading: permissionsLoading } = useUserPermissions();

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Show loading while checking auth status and permissions
    if (loading || permissionsLoading) {
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
                        onClick={() => canManageFood ? router.push('/home/menu') : null}
                        disabled={!canManageFood}
                        className={`group relative w-full max-w-md h-16 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 ${canManageFood
                            ? "bg-gradient-to-r from-gray-500/20 via-gray-600/20 to-gray-700/20 border-white/20 hover:scale-105 hover:shadow-2xl hover:shadow-gray-500/25 cursor-pointer"
                            : "bg-gradient-to-r from-gray-800/40 via-gray-900/40 to-gray-800/40 border-gray-600/40 cursor-not-allowed opacity-60"
                            }`}
                    >
                        {/* Animated gradient overlay */}
                        {canManageFood && (
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-600/30 via-gray-700/30 to-gray-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        )}

                        {/* Button content */}
                        <div className="relative flex items-center justify-center h-full px-8">
                            <div className="flex items-center space-x-3">
                                <Pizza className={`h-5 w-5 ${canManageFood ? 'text-white' : 'text-gray-500'}`} />
                                <span className={`text-xl font-semibold tracking-wide ${canManageFood ? 'text-white' : 'text-gray-500'}`}>
                                    Menus {!canManageFood && '(No Access)'}
                                </span>
                                {canManageFood && (
                                    <div className="p-1 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300 group-hover:translate-x-1">
                                        <ChevronRight className="h-5 w-5 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shimmer effect */}
                        {canManageFood && (
                            <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-out"></div>
                        )}
                    </button>

                    {/* Manage Sports Button */}
                    <button
                        onClick={() => canManageSports ? router.push('/home/sports') : null}
                        disabled={!canManageSports}
                        className={`group relative w-full max-w-md h-16 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 ${canManageSports
                            ? "bg-gradient-to-r from-gray-500/20 via-gray-600/20 to-gray-700/20 border-white/20 hover:scale-105 hover:shadow-2xl hover:shadow-gray-500/25 cursor-pointer"
                            : "bg-gradient-to-r from-gray-800/40 via-gray-900/40 to-gray-800/40 border-gray-600/40 cursor-not-allowed opacity-60"
                            }`}
                    >
                        {/* Animated gradient overlay */}
                        {canManageSports && (
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-600/30 via-gray-700/30 to-gray-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        )}

                        {/* Button content */}
                        <div className="relative flex items-center justify-center h-full px-8">
                            <div className="flex items-center space-x-3">
                                <Icon iconNode={football} className={`h-5 w-5 ${canManageSports ? 'text-white' : 'text-gray-500'}`} />
                                <span className={`text-xl font-semibold tracking-wide ${canManageSports ? 'text-white' : 'text-gray-500'}`}>
                                    Sports {!canManageSports && '(No Access)'}
                                </span>
                                {canManageSports && (
                                    <div className="p-1 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300 group-hover:translate-x-1">
                                        <ChevronRight className="h-5 w-5 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shimmer effect */}
                        {canManageSports && (
                            <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 ease-out"></div>
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}