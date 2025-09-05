'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ParsedMenu, MenuDay, Course } from '@/app/services/menuParser';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/app/components/Navigation';
import { v4 as uuidv4 } from 'uuid';

interface SavedCourse {
    id: string;
    courseType: string;
    foodItem: string;
}

interface SavedMeal {
    id: string;
    timeOfDay: string;
    startTime: string;
    endTime: string;
    courses: Record<string, SavedCourse>;
}

export default function MenuReviewPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editedMenu, setEditedMenu] = useState<ParsedMenu | null>(null);
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [published, setPublished] = useState(true);

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        // Get the menu data from URL params (passed from the dialog)
        const menuDataParam = searchParams.get('menuData');
        if (menuDataParam) {
            try {
                const parsed = JSON.parse(decodeURIComponent(menuDataParam)) as ParsedMenu;
                setEditedMenu(JSON.parse(JSON.stringify(parsed))); // Deep copy for editing

                // Set default date to today
                const today = new Date().toISOString().split('T')[0];
                setDate(today);
            } catch (error) {
                console.error('Error parsing menu data:', error);
                router.push('/home/menu');
            }
        } else {
            // No menu data, redirect back
            router.push('/home/menu');
        }
    }, [searchParams, router]);

    const updateMenuDay = (dayIndex: number, updatedDay: MenuDay) => {
        if (!editedMenu) return;

        setEditedMenu({
            ...editedMenu,
            [dayIndex]: updatedDay
        });
    };

    const updateCourse = (dayIndex: number, courseIndex: number, updatedCourse: Course) => {
        if (!editedMenu || !editedMenu[dayIndex]) return;

        const updatedDay = { ...editedMenu[dayIndex] };
        updatedDay.courses[courseIndex] = updatedCourse;
        updateMenuDay(dayIndex, updatedDay);
    };

    const deleteCourse = (dayIndex: number, courseIndex: number) => {
        if (!editedMenu || !editedMenu[dayIndex]) return;

        const updatedDay = { ...editedMenu[dayIndex] };
        updatedDay.courses = updatedDay.courses.filter((_, index) => index !== courseIndex);
        updateMenuDay(dayIndex, updatedDay);
    };

    const addCourse = (dayIndex: number) => {
        if (!editedMenu || !editedMenu[dayIndex]) return;

        const updatedDay = { ...editedMenu[dayIndex] };
        const newCourse: Course = {
            id: Date.now(), // Simple ID generation
            courseType: 'New Course',
            foodItems: ''
        };
        updatedDay.courses.push(newCourse);
        updateMenuDay(dayIndex, updatedDay);
    };

    const saveMenu = async () => {
        if (!editedMenu || !user) return;

        setSaving(true);
        try {
            // Convert ParsedMenu to a format suitable for Firebase
            const menuToSave = {
                date: date,
                notes: notes,
                published: published,
                userId: user.uid,
                createdAt: new Date(),
                updatedAt: new Date(),
                meals: Object.entries(editedMenu).reduce((acc: Record<string, SavedMeal>, [, menuDay], mealIndex) => {
                    acc[mealIndex.toString()] = {
                        id: uuidv4(),
                        timeOfDay: menuDay.timeOfDay,
                        startTime: menuDay.startTime,
                        endTime: menuDay.endTime,
                        courses: menuDay.courses.reduce((courseAcc: Record<string, SavedCourse>, course: Course, index: number) => {
                            courseAcc[index.toString()] = {
                                id: uuidv4(),
                                courseType: course.courseType,
                                foodItem: course.foodItems
                            };
                            return courseAcc;
                        }, {})
                    };
                    return acc;
                }, {})
            };

            // Save to Firebase
            const menusCollection = collection(db, 'menus');
            await addDoc(menusCollection, menuToSave);

            console.log('Menu saved successfully');
            router.push('/home/menu');
        } catch (error) {
            console.error('Error saving menu:', error);
        } finally {
            setSaving(false);
        }
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
    if (!user || !editedMenu) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navigation title="Review Menu" showBackButton={true} backButtonPath="/home/menu" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-gray-800 rounded-lg shadow-md p-6">
                    {/* Menu Metadata */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white mb-6">Review & Edit Parsed Menu</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Menu Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Published
                                </label>
                                <div className="flex items-center space-x-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={published}
                                            onChange={(e) => setPublished(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Add any notes about this menu (optional)"
                            />
                        </div>
                    </div>

                    {/* Menu Days */}
                    <div className="space-y-6">
                        {Object.entries(editedMenu).map(([dayIndex, menuDay]) => (
                            <div key={dayIndex} className="bg-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-white">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][parseInt(dayIndex)] || `Day ${parseInt(dayIndex) + 1}`} - {menuDay.timeOfDay}
                                    </h2>
                                    <button
                                        onClick={() => addCourse(parseInt(dayIndex))}
                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Add Course
                                    </button>
                                </div>

                                {/* Time Range */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                            Start Time
                                        </label>
                                        <input
                                            type="text"
                                            value={menuDay.startTime}
                                            onChange={(e) => updateMenuDay(parseInt(dayIndex), {
                                                ...menuDay,
                                                startTime: e.target.value
                                            })}
                                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                            End Time
                                        </label>
                                        <input
                                            type="text"
                                            value={menuDay.endTime}
                                            onChange={(e) => updateMenuDay(parseInt(dayIndex), {
                                                ...menuDay,
                                                endTime: e.target.value
                                            })}
                                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Courses */}
                                <div className="space-y-3">
                                    {menuDay.courses.map((course: Course, courseIndex: number) => (
                                        <div key={course.id} className="bg-gray-600 rounded p-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="mb-2">
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                                            Course Type
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={course.courseType}
                                                            onChange={(e) => updateCourse(parseInt(dayIndex), courseIndex, {
                                                                ...course,
                                                                courseType: e.target.value
                                                            })}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                                            Food Items
                                                        </label>
                                                        <textarea
                                                            value={course.foodItems}
                                                            onChange={(e) => updateCourse(parseInt(dayIndex), courseIndex, {
                                                                ...course,
                                                                foodItems: e.target.value
                                                            })}
                                                            rows={3}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Enter food items separated by commas"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteCourse(parseInt(dayIndex), courseIndex)}
                                                    className="mt-6 p-1 text-red-400 hover:text-red-300 transition-colors"
                                                    title="Delete course"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-600">
                        <button
                            onClick={() => router.push('/home/menu')}
                            className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveMenu}
                            disabled={saving || !date}
                            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Menu'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
