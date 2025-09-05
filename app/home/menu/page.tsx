'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/app/components/Navigation';
import AddMenuDialog from '@/app/components/AddMenuDialog';

interface Menu {
    id: string;
    week?: string;
    date?: string;
    published?: boolean;
    meals?: Record<string, {
        startTime?: string;
        endTime?: string;
        courses?: Record<string, {
            courseType?: string;
            foodItem?: string;
        }>;
    }>;
    updatedAt?: {
        seconds: number;
        nanoseconds: number;
    };
    // Add other specific fields as needed
    [key: string]: unknown; // Allow for flexible menu structure
}

export default function ManageMenusPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [menusLoading, setMenusLoading] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const [showAddMenuDialog, setShowAddMenuDialog] = useState(false);

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Fetch menus from Firebase
    useEffect(() => {
        const fetchMenus = async () => {
            if (!user) return; // Only fetch if user is authenticated

            try {
                setMenusLoading(true);
                const menusCollection = collection(db, 'menus');
                const menusSnapshot = await getDocs(menusCollection);
                const menusList = menusSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort menus by date (most recent first)
                const sortedMenus = menusList.sort((a: Menu, b: Menu) => {
                    const dateA = a.date ? new Date(a.date) : new Date(0);
                    const dateB = b.date ? new Date(b.date) : new Date(0);
                    return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
                });

                setMenus(sortedMenus);
            } catch (error) {
                console.error('Error fetching menus:', error);
            } finally {
                setMenusLoading(false);
            }
        };

        fetchMenus();
    }, [user]);

    const toggleMenu = (menuId: string) => {
        setExpandedMenu(expandedMenu === menuId ? null : menuId);
    };

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
            <Navigation title="Manage Menus" showBackButton={true} backButtonPath="/home" />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Weekly Menus</h1>
                        <button
                            onClick={() => setShowAddMenuDialog(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                        >
                            Add Menu
                        </button>
                    </div>

                    {menusLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-white">Loading menus...</div>
                        </div>
                    ) : menus.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-white">No menus found.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {menus.map((menu) => {
                                const isExpanded = expandedMenu === menu.id;
                                return (
                                    <div key={menu.id} className="border border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                        {/* Compact single line - clickable */}
                                        <div
                                            className="px-4 py-2 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
                                            onClick={() => toggleMenu(menu.id)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-base font-medium text-white">
                                                    {menu.date || 'No Date'}
                                                </h3>
                                                {menu.week && (
                                                    <span className="text-sm text-gray-400">
                                                        Week {menu.week}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className={`transform transition-transform text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    ▼
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="px-4 pb-3 border-t border-gray-600 bg-gray-800">
                                                <div className="pt-3 space-y-4">
                                                    {/* Basic Info */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-medium text-gray-300">Date:</span>
                                                            <span className="ml-2 text-white">{menu.date || 'Not specified'}</span>
                                                        </div>
                                                        {menu.week && (
                                                            <div>
                                                                <span className="font-medium text-gray-300">Week:</span>
                                                                <span className="ml-2 text-white">{menu.week}</span>
                                                            </div>
                                                        )}
                                                        {menu.published !== undefined && (
                                                            <div>
                                                                <span className="font-medium text-gray-300">Status:</span>
                                                                <span className={`ml-2 ${menu.published ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                    {menu.published ? 'Published' : 'Unpublished'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Meals Details */}
                                                    {menu.meals && (
                                                        <div>
                                                            <h4 className="font-medium text-white mb-3">Daily Meals</h4>
                                                            <div className="text-sm">
                                                                {typeof menu.meals === 'object' && menu.meals !== null ? (
                                                                    <div className="space-y-4">
                                                                        {Object.entries(menu.meals).map(([mealTime, mealData]) => (
                                                                            <div key={mealTime} className="bg-gray-700 rounded-lg p-3">
                                                                                <h5 className="font-medium text-white capitalize mb-2 border-b border-gray-600 pb-1">
                                                                                    {mealTime}
                                                                                    {mealData?.startTime && mealData?.endTime && (
                                                                                        <span className="text-xs text-gray-400 ml-2">
                                                                                            ({mealData.startTime} - {mealData.endTime})
                                                                                        </span>
                                                                                    )}
                                                                                </h5>
                                                                                {typeof mealData === 'object' && mealData?.courses ? (
                                                                                    <div className="space-y-2">
                                                                                        {Object.entries(mealData.courses || {}).map(([courseKey, courseData]) => (
                                                                                            <div key={courseKey} className="ml-2">
                                                                                                <div className="text-gray-300 font-medium">
                                                                                                    {courseData?.courseType || courseKey}:
                                                                                                </div>
                                                                                                <div className="text-white ml-3 text-sm">
                                                                                                    {courseData?.foodItem || 'Menu item available'}
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-gray-300 ml-2">
                                                                                        Menu available - details not structured
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-gray-300">No meal data available</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Additional metadata */}
                                                    <div className="pt-2 border-t border-gray-700">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-400">
                                                            <div>
                                                                <span>ID: {menu.id}</span>
                                                            </div>
                                                            {menu.updatedAt && (
                                                                <div>
                                                                    <span>Last updated: {menu.updatedAt?.seconds ?
                                                                        new Date(menu.updatedAt.seconds * 1000).toLocaleDateString() :
                                                                        'Unknown'
                                                                    }</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Add Menu Dialog */}
            <AddMenuDialog
                isOpen={showAddMenuDialog}
                onClose={() => setShowAddMenuDialog(false)}
            />
        </div>
    );
}
