'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/app/components/Navigation';
import { Calendar, User, Eye, EyeOff, Search, ChevronDown } from 'lucide-react';

// Image component with fallback
const ImageWithFallback = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    console.log('Rendering image with src:', src);

    if (imageError) {
        return (
            <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400`}>
                <div className="text-center p-4">
                    <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p className="text-xs">Image not found</p>
                    <p className="text-xs text-gray-400 mt-1 break-all max-w-[200px]">{src}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {imageLoading && (
                <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 absolute inset-0`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                        <p className="text-xs mt-2">Loading...</p>
                    </div>
                </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className={className}
                onLoad={() => {
                    console.log('Image loaded successfully:', src);
                    setImageLoading(false);
                }}
                onError={(e) => {
                    console.error('Image failed to load:', src);
                    setImageError(true);
                    setImageLoading(false);
                }}
                style={{ display: imageLoading ? 'none' : 'block' }}
            />
        </div>
    );
};

// TypeScript interface for athlete entry
interface AthleteEntry {
    id: string;
    content: string;
    createdAt: Timestamp | Date | null;
    imageUrl: string;
    published: boolean;
    title: string;
    type: string;
    updatedAt: Timestamp | Date | null;
    userId: string;
    weekOf: string;
}

export default function SportsPage() {
    const [entries, setEntries] = useState<AthleteEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filteredEntries, setFilteredEntries] = useState<AthleteEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showOnlyPublished, setShowOnlyPublished] = useState(false);
    const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'weekOf' | 'title'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Fetch athlete entries from Firebase
    const fetchEntries = async () => {
        try {
            setLoading(true);
            const entriesRef = collection(db, 'athlete-entries');
            const q = query(entriesRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const entriesData: AthleteEntry[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AthleteEntry));

            setEntries(entriesData);

            // Debug: Log image URLs to see what we're working with
            console.log('Athlete entries loaded:', entriesData.length);
            entriesData.forEach((entry, index) => {
                if (entry.imageUrl) {
                    console.log(`Entry ${index + 1} (${entry.title}): imageUrl =`, entry.imageUrl);
                }
            });
        } catch (error) {
            console.error('Error fetching athlete entries:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort entries
    useEffect(() => {
        let filtered = entries;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(entry =>
                entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(entry => entry.type === filterType);
        }

        // Published filter
        if (showOnlyPublished) {
            filtered = filtered.filter(entry => entry.published);
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue: Date | string, bValue: Date | string;

            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                const aTimestamp = a[sortBy];
                const bTimestamp = b[sortBy];

                aValue = aTimestamp instanceof Date
                    ? aTimestamp
                    : aTimestamp && 'toDate' in aTimestamp
                        ? aTimestamp.toDate()
                        : new Date(0);

                bValue = bTimestamp instanceof Date
                    ? bTimestamp
                    : bTimestamp && 'toDate' in bTimestamp
                        ? bTimestamp.toDate()
                        : new Date(0);
            } else if (sortBy === 'weekOf') {
                aValue = new Date(a[sortBy]);
                bValue = new Date(b[sortBy]);
            } else {
                aValue = a[sortBy].toLowerCase();
                bValue = b[sortBy].toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredEntries(filtered);
    }, [entries, searchTerm, filterType, showOnlyPublished, sortBy, sortOrder]);

    useEffect(() => {
        fetchEntries();
    }, []);

    // Get unique types for filter dropdown
    const uniqueTypes = Array.from(new Set(entries.map(entry => entry.type))).filter(Boolean);

    // Format date helper
    const formatDate = (timestamp: Timestamp | Date | null) => {
        if (!timestamp) return 'N/A';
        const date = timestamp instanceof Date ? timestamp : (timestamp as Timestamp).toDate();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation title="Sports Management" showBackButton={true} backButtonPath="/home" />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-foreground">Loading athlete entries...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navigation title="Sports Management" showBackButton={true} backButtonPath="/home" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Athlete Entries</h1>
                    <p className="text-muted-foreground">
                        Manage and view athlete entries. Total entries: {entries.length}
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="bg-card border border-border rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search entries..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                            >
                                <option value="all">All Types</option>
                                {uniqueTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Sort By */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                            >
                                <option value="createdAt">Created Date</option>
                                <option value="updatedAt">Updated Date</option>
                                <option value="weekOf">Week Of</option>
                                <option value="title">Title</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Sort Order & Published Filter */}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground hover:bg-muted transition-colors"
                            >
                                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                            </button>
                            <button
                                onClick={() => setShowOnlyPublished(!showOnlyPublished)}
                                className={`px-3 py-2 border rounded-md transition-colors ${showOnlyPublished
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-border hover:bg-muted'
                                    }`}
                            >
                                {showOnlyPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredEntries.length} of {entries.length} entries
                    </p>
                </div>

                {/* Entries Grid */}
                {filteredEntries.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-muted-foreground mb-4">
                            {entries.length === 0 ? 'No athlete entries found.' : 'No entries match your filters.'}
                        </div>
                        {entries.length > 0 && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterType('all');
                                    setShowOnlyPublished(false);
                                }}
                                className="text-primary hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Image */}
                                {entry.imageUrl && (
                                    <div className="aspect-video bg-muted relative overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={entry.imageUrl}
                                            alt={entry.title}
                                            className="w-full h-full object-cover"
                                            onLoad={() => {
                                                console.log('Image loaded successfully:', entry.imageUrl);
                                            }}
                                            onError={(e) => {
                                                console.error('Image failed to load:', entry.imageUrl);
                                                const img = e.target as HTMLImageElement;
                                                img.style.display = 'none';
                                                // Show a fallback placeholder
                                                const parent = img.parentElement;
                                                if (parent && !parent.querySelector('.image-fallback')) {
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'image-fallback absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400';
                                                    fallback.innerHTML = `
                                                        <div class="text-center">
                                                            <svg class="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                            </svg>
                                                            <p class="text-xs">Image not found</p>
                                                            <p class="text-xs text-gray-400 mt-1 break-all">${entry.imageUrl}</p>
                                                        </div>
                                                    `;
                                                    parent.appendChild(fallback);
                                                }
                                            }}
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                )}

                                <div className="p-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                                                {entry.title}
                                            </h3>
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <span className="bg-secondary px-2 py-1 rounded-full text-xs">
                                                    {entry.type}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs ${entry.published
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                    {entry.published ? 'Published' : 'Draft'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Preview */}
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {entry.content}
                                    </p>

                                    {/* Metadata */}
                                    <div className="space-y-2 text-xs text-muted-foreground">
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Week of: {entry.weekOf}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <User className="h-3 w-3" />
                                            <span>User ID: {entry.userId}</span>
                                        </div>
                                        <div>Created: {formatDate(entry.createdAt)}</div>
                                        {entry.updatedAt && (
                                            <div>Updated: {formatDate(entry.updatedAt)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}