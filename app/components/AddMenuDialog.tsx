'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createWorker } from 'tesseract.js';
import { MenuParser } from '../services/menuParser';

interface AddMenuDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddMenuDialog({ isOpen, onClose }: AddMenuDialogProps) {
    const router = useRouter();
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const extractTextFromFiles = useCallback(async () => {
        if (files.length === 0) {
            console.log('No files to process');
            return;
        }

        setIsProcessing(true);
        console.log(`🔍 Starting OCR extraction for ${files.length} files...`);
        const allExtractedTexts: string[] = [];

        // First, extract text from all PNG files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

            // Check if file is PNG
            if (!file.type.includes('png')) {
                console.warn(`⚠️ Skipping ${file.name} - not a PNG file`);
                continue;
            }

            try {
                // Create a Tesseract worker
                const worker = await createWorker('eng');

                console.log(`🤖 OCR worker created, analyzing ${file.name}...`);

                // Extract text from the image
                const { data: { text } } = await worker.recognize(file);

                console.log(`✅ Text extracted from ${file.name}`);
                console.log('Raw OCR text:', text);
                console.log('---');

                // Add to our collection of texts
                allExtractedTexts.push(text);

                // Terminate the worker
                await worker.terminate();

            } catch (error) {
                console.error(`❌ Error processing ${file.name}:`, error);
            }
        }

        // Now combine all texts and parse as one menu
        if (allExtractedTexts.length > 0) {
            console.log('🔗 Combining all extracted texts...');
            const combinedText = allExtractedTexts.join('\n\n');

            console.log('📋 Combined text for parsing:');
            console.log(combinedText);
            console.log('===============================');

            // Parse the combined menu
            const parsedMenuData = MenuParser.parseMenu(combinedText);
            console.log('🎉 Final parsed menu structure:', parsedMenuData);

            // Navigate to review page with the parsed data
            const menuDataParam = encodeURIComponent(JSON.stringify(parsedMenuData));
            router.push(`/home/menu/review?menuData=${menuDataParam}`);

            // Close the dialog
            onClose();
        } else {
            console.log('❌ No text was extracted from any files');
        }

        setIsProcessing(false);
    }, [files, router, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>

            {/* Dialog */}
            <div className="relative bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 border border-gray-600">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Add New Menu</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* File Drop Area */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Menu Files
                    </label>
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="space-y-2">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                            >
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <div className="text-gray-300">
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <span className="text-blue-400 hover:text-blue-300">
                                        Click to upload
                                    </span>
                                    <span> or drag and drop</span>
                                </label>
                                <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    multiple
                                    onChange={handleFileInput}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                PNG Files Only
                            </p>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">
                            Selected Files ({files.length})
                        </h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-gray-700 rounded border border-gray-600"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={extractTextFromFiles}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={files.length === 0 || isProcessing}
                    >
                        {isProcessing ? 'Processing...' : 'Start Parsing'}
                    </button>
                </div>
            </div>
        </div>
    );
}
