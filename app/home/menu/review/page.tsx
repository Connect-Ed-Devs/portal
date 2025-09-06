'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ParsedWeeklyMenu, DayMenu, MealTime, Course } from '@/app/services/menuParser';
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
    courses: SavedCourse[];
}

function MenuReviewContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editedMenu, setEditedMenu] = useState<ParsedWeeklyMenu | null>(null);
    const [saving, setSaving] = useState(false);
    const [weekStartDate, setWeekStartDate] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedDaysToPublish, setSelectedDaysToPublish] = useState<Set<number>>(new Set());

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
                const parsed = JSON.parse(decodeURIComponent(menuDataParam)) as ParsedWeeklyMenu;
                setEditedMenu(JSON.parse(JSON.stringify(parsed))); // Deep copy for editing

                // Set default week start date to current Monday
                const today = new Date();
                const monday = new Date(today);
                const dayOfWeek = today.getDay();
                const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
                monday.setDate(diff);
                setWeekStartDate(monday.toISOString().split('T')[0]);

                // By default, select all days for publishing
                const dayIndices = Object.keys(parsed).map(Number);
                setSelectedDaysToPublish(new Set(dayIndices));
            } catch (error) {
                console.error('Error parsing menu data:', error);
                router.push('/home/menu');
            }
        } else {
            // No menu data, redirect back
            router.push('/home/menu');
        }
    }, [searchParams, router]);

    const updateDayMenu = (dayIndex: number, updatedDay: DayMenu) => {
        if (!editedMenu) return;

        setEditedMenu({
            ...editedMenu,
            [dayIndex]: updatedDay
        });
    };

    const updateMealTime = (dayIndex: number, mealIndex: number, updatedMeal: MealTime) => {
        if (!editedMenu || !editedMenu[dayIndex]) return;

        const updatedDay = { ...editedMenu[dayIndex] };
        updatedDay.meals[mealIndex] = updatedMeal;
        updateDayMenu(dayIndex, updatedDay);
    };

    const updateCourse = (dayIndex: number, mealIndex: number, courseIndex: number, updatedCourse: Course) => {
        if (!editedMenu || !editedMenu[dayIndex] || !editedMenu[dayIndex].meals[mealIndex]) return;

        const updatedMeal = { ...editedMenu[dayIndex].meals[mealIndex] };
        updatedMeal.courses[courseIndex] = updatedCourse;
        updateMealTime(dayIndex, mealIndex, updatedMeal);
    };

    const deleteCourse = (dayIndex: number, mealIndex: number, courseIndex: number) => {
        if (!editedMenu || !editedMenu[dayIndex] || !editedMenu[dayIndex].meals[mealIndex]) return;

        const updatedMeal = { ...editedMenu[dayIndex].meals[mealIndex] };
        updatedMeal.courses = updatedMeal.courses.filter((_, index) => index !== courseIndex);
        updateMealTime(dayIndex, mealIndex, updatedMeal);
    };

    const addCourse = (dayIndex: number, mealIndex: number) => {
        if (!editedMenu || !editedMenu[dayIndex] || !editedMenu[dayIndex].meals[mealIndex]) return;

        const updatedMeal = { ...editedMenu[dayIndex].meals[mealIndex] };
        const newCourse: Course = {
            id: Date.now(), // Simple ID generation
            courseType: 'New Course',
            foodItems: ''
        };
        updatedMeal.courses.push(newCourse);
        updateMealTime(dayIndex, mealIndex, updatedMeal);
    };

    const toggleDaySelection = (dayIndex: number) => {
        const newSelected = new Set(selectedDaysToPublish);
        if (newSelected.has(dayIndex)) {
            newSelected.delete(dayIndex);
        } else {
            newSelected.add(dayIndex);
        }
        setSelectedDaysToPublish(newSelected);
    };

    const saveMenus = async () => {
        if (!editedMenu || !user || selectedDaysToPublish.size === 0) return;

        setSaving(true);
        try {
            const menusCollection = collection(db, 'menus');
            const baseDate = new Date(weekStartDate);

            // Create a separate menu document for each selected day
            const savePromises = Array.from(selectedDaysToPublish).map(async (dayIndex) => {
                const dayMenu = editedMenu[dayIndex];
                if (!dayMenu) return;

                // Calculate the date for this day
                const dayDate = new Date(baseDate);
                dayDate.setDate(baseDate.getDate() + dayIndex);

                const menuToSave = {
                    date: dayDate.toISOString().split('T')[0],
                    dayName: dayMenu.dayName,
                    notes: notes,
                    published: true,
                    userId: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    meals: dayMenu.meals.map((mealTime: MealTime): SavedMeal => ({
                        id: uuidv4(),
                        timeOfDay: mealTime.timeOfDay,
                        startTime: mealTime.startTime,
                        endTime: mealTime.endTime,
                        courses: mealTime.courses.map((course: Course) => ({
                            id: uuidv4(),
                            courseType: course.courseType,
                            foodItem: course.foodItems
                        }))
                    }))
                };

                return addDoc(menusCollection, menuToSave);
            });

            await Promise.all(savePromises);

            console.log(`Successfully saved ${selectedDaysToPublish.size} daily menus`);
            router.push('/home/menu');
        } catch (error) {
            console.error('Error saving menus:', error);
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
                        <h1 className="text-2xl font-bold text-white mb-6">Review & Edit Weekly Menu</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Week Starting Date (Monday)
                                </label>
                                <input
                                    type="date"
                                    value={weekStartDate}
                                    onChange={(e) => setWeekStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Days to Publish ({selectedDaysToPublish.size} selected)
                                </label>
                                <div className="text-sm text-gray-400">
                                    Select individual days below to publish
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Notes (applies to all published menus)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Add any notes about this weekly menu (optional)"
                            />
                        </div>
                    </div>

                    {/* Menu Days */}
                    <div className="space-y-6">
                        {Object.entries(editedMenu).map(([dayIndex, dayMenu]) => {
                            const dayIdx = parseInt(dayIndex);
                            const isSelected = selectedDaysToPublish.has(dayIdx);
                            const baseDate = new Date(weekStartDate);
                            const dayDate = new Date(baseDate);
                            dayDate.setDate(baseDate.getDate() + dayIdx);

                            return (
                                <div key={dayIndex} className={`bg-gray-700 rounded-lg p-4 border-2 ${isSelected ? 'border-green-500' : 'border-gray-600'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleDaySelection(dayIdx)}
                                                    className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                                                />
                                                <span className="ml-2 text-lg font-semibold text-white">
                                                    {dayMenu.dayName} - {dayDate.toLocaleDateString()}
                                                </span>
                                            </label>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {dayMenu.meals.length} meal{dayMenu.meals.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {/* Meals for this day */}
                                    <div className="space-y-4">
                                        {dayMenu.meals.map((meal: MealTime, mealIndex: number) => (
                                            <div key={meal.id} className="bg-gray-600 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-md font-medium text-white capitalize">
                                                        {meal.timeOfDay}
                                                    </h3>
                                                    <button
                                                        onClick={() => addCourse(dayIdx, mealIndex)}
                                                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                                                    >
                                                        Add Course
                                                    </button>
                                                </div>

                                                {/* Time Range */}
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                                            Start Time
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={meal.startTime}
                                                            onChange={(e) => updateMealTime(dayIdx, mealIndex, {
                                                                ...meal,
                                                                startTime: e.target.value
                                                            })}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                                            End Time
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={meal.endTime}
                                                            onChange={(e) => updateMealTime(dayIdx, mealIndex, {
                                                                ...meal,
                                                                endTime: e.target.value
                                                            })}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Courses */}
                                                <div className="space-y-2">
                                                    {meal.courses.map((course: Course, courseIndex: number) => (
                                                        <div key={course.id} className="bg-gray-800 rounded p-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1">
                                                                    <div className="mb-2">
                                                                        <label className="block text-xs font-medium text-gray-400 mb-1">
                                                                            Course Type
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={course.courseType}
                                                                            onChange={(e) => updateCourse(dayIdx, mealIndex, courseIndex, {
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
                                                                            onChange={(e) => updateCourse(dayIdx, mealIndex, courseIndex, {
                                                                                ...course,
                                                                                foodItems: e.target.value
                                                                            })}
                                                                            rows={2}
                                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            placeholder="Enter food items separated by commas"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteCourse(dayIdx, mealIndex, courseIndex)}
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
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-600">
                        <div className="text-sm text-gray-400">
                            {selectedDaysToPublish.size === 0
                                ? 'Select at least one day to publish'
                                : `Publishing ${selectedDaysToPublish.size} daily menu${selectedDaysToPublish.size !== 1 ? 's' : ''}`
                            }
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.push('/home/menu')}
                                className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveMenus}
                                disabled={saving || !weekStartDate || selectedDaysToPublish.size === 0}
                                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Publishing...' : `Publish ${selectedDaysToPublish.size} Menu${selectedDaysToPublish.size !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function MenuReviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-foreground">Loading...</div>
            </div>
        }>
            <MenuReviewContent />
        </Suspense>
    );
}
