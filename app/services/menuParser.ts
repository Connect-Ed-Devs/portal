// Menu Parser Service
// Parses OCR-extracted text into structured menu data

export interface Course {
    id: number;
    courseType: string;
    foodItems: string;
}

export interface MenuDay {
    id: number;
    timeOfDay: string;
    startTime: string;
    endTime: string;
    courses: Course[];
}

export interface ParsedMenu {
    [dayIndex: number]: MenuDay;
}

export class MenuParser {
    private static readonly DAY_PATTERNS = [
        /Monday/i, /Tuesday/i, /Wednesday/i, /Thursday/i, /Friday/i, /Saturday/i, /Sunday/i
    ];

    private static readonly TIME_OF_DAY_PATTERNS = [
        { pattern: /breakfast/i, value: 'breakfast' },
        { pattern: /brunch/i, value: 'brunch' },
        { pattern: /lunch/i, value: 'lunch' },
        { pattern: /dinner/i, value: 'dinner' }
    ];

    private static readonly COURSE_TYPE_PATTERNS = [
        'Entrée', 'Entree', 'International Station', 'Intemational Station',
        'Salads of the Day', 'salads of the Day', 'Soups of the Day', 'Pasta Station',
        'Dessert', 'Appetizer', 'Main Course', 'Side Dish'
    ];

    /**
     * Parse OCR text into structured menu data
     */
    static parseMenu(ocrText: string): ParsedMenu {
        console.log('Starting menu parsing...');

        const cleanedText = this.cleanText(ocrText);
        const dayBlocks = this.extractDayBlocks(cleanedText);

        const parsedMenu: ParsedMenu = {};

        dayBlocks.forEach((dayBlock, index) => {
            const menuDay = this.parseDayBlock(dayBlock, index);
            if (menuDay) {
                parsedMenu[index] = menuDay;
            }
        });

        console.log('Menu parsing completed:', parsedMenu);
        return parsedMenu;
    }

    /**
     * Clean and normalize the OCR text
     */
    private static cleanText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/'/g, "'")
            .replace(/"/g, '"')
            .replace(/"/g, '"')
            .replace(/—/g, '-')
            .replace(/–/g, '-') // En dash
            .replace(/…/g, '...') // Ellipsis
            .replace(/\u00A0/g, ' ') // Non-breaking spaces
            .replace(/\u2000-\u200F/g, ' ') // Various Unicode spaces
            .replace(/\u2028-\u2029/g, '\n') // Line/paragraph separators
            .trim();
    }

    /**
     * Extract individual day blocks from the text
     */
    private static extractDayBlocks(text: string): string[] {
        const lines = text.split('\n');
        const dayBlocks: string[] = [];
        let currentBlock: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check if this line starts a new day
            const isDayHeader = this.DAY_PATTERNS.some(pattern => pattern.test(trimmedLine));

            if (isDayHeader && currentBlock.length > 0) {
                // Save the previous block
                dayBlocks.push(currentBlock.join('\n'));
                currentBlock = [];
            }

            if (trimmedLine) {
                currentBlock.push(trimmedLine);
            }
        }

        // Add the last block
        if (currentBlock.length > 0) {
            dayBlocks.push(currentBlock.join('\n'));
        }

        return dayBlocks;
    }

    /**
     * Parse a single day block into a MenuDay object
     */
    private static parseDayBlock(dayBlock: string, dayIndex: number): MenuDay | null {
        const lines = dayBlock.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length === 0) return null;

        const headerLine = lines[0];
        const timeInfo = this.extractTimeInfo(headerLine);

        if (!timeInfo) {
            console.warn(`Could not parse time info from: ${headerLine}`);
            return null;
        }

        const courses = this.parseCourses(lines.slice(1));

        return {
            id: dayIndex,
            timeOfDay: timeInfo.timeOfDay,
            startTime: timeInfo.startTime,
            endTime: timeInfo.endTime,
            courses
        };
    }

    /**
     * Extract time information from a day header line
     */
    private static extractTimeInfo(headerLine: string): {
        timeOfDay: string;
        startTime: string;
        endTime: string;
    } | null {
        // Extract time of day (breakfast, lunch, etc.)
        let timeOfDay = 'lunch'; // default
        for (const { pattern, value } of this.TIME_OF_DAY_PATTERNS) {
            if (pattern.test(headerLine)) {
                timeOfDay = value;
                break;
            }
        }

        // Extract time range (e.g., "11:20am — 1pm")
        const timeMatch = headerLine.match(/(\d{1,2}:\d{2}(?:am|pm)?)\s*[-—–]\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i);

        if (timeMatch) {
            return {
                timeOfDay,
                startTime: timeMatch[1].trim(),
                endTime: timeMatch[2].trim()
            };
        }

        // Fallback - try to extract any time
        const singleTimeMatch = headerLine.match(/(\d{1,2}:\d{2}(?:am|pm)?)/i);
        if (singleTimeMatch) {
            return {
                timeOfDay,
                startTime: singleTimeMatch[1].trim(),
                endTime: singleTimeMatch[1].trim()
            };
        }

        return null;
    }

    /**
     * Remove notice/disclaimer sections that are common in institutional menus
     */
    private static removeNoticeSection(text: string): string {
        // Common patterns that indicate start of notice/disclaimer sections
        const noticePatterns = [
            /Notice\*?[,.]?/i,
            /\*?Notice[,.]?/i,
            /The salad bars?.+?remain the same/i,
            /Symbols to identify/i,
            /Salad Bar[,.]?$/i,
            /Daily choice of Mixed Greens/i,
            /Vegetarian\s*-[,.]?\s*Vegan\s*-[,.]?\s*Halal\s*-[,.]?\s*Gluten Free\s*-/i
        ];

        // Find where the notice section begins
        let noticeStart = -1;

        for (const pattern of noticePatterns) {
            const match = text.match(pattern);
            if (match && match.index !== undefined) {
                noticeStart = match.index;
                break;
            }
        }

        // If we found a notice section, remove everything from that point onward
        if (noticeStart !== -1) {
            return text.substring(0, noticeStart).trim();
        }

        return text;
    }

    /**
     * Parse courses from the remaining lines
     */
    private static parseCourses(lines: string[]): Course[] {
        const courses: Course[] = [];
        let currentCourseType = '';
        let currentFoodItems: string[] = [];
        let courseId = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip lines that are part of notice/disclaimer sections
            const isNoticeLine = [
                /Notice\*?/i,
                /\*?Notice/i,
                /The salad bars?.+?remain/i,
                /Symbols to identify/i,
                /^Salad Bar$/i,
                /Daily choice of Mixed Greens/i,
                /Diced Cucumbers/i,
                /Carrot Sticks/i,
                /Sunflower seed/i,
                /Alternating Dressing/i,
                /Selection of Deli Meats/i,
                /Vegetarian\s*-.*Vegan\s*-.*Halal\s*-.*Gluten Free\s*-/i,
                /^Deli Bar$/i,
                /^Dressings$/i
            ].some(pattern => pattern.test(trimmedLine));

            if (isNoticeLine) {
                // Stop processing once we hit the notice section
                break;
            }

            // Check if this line is a course type header
            const isCourseType = this.COURSE_TYPE_PATTERNS.some(pattern =>
                trimmedLine.toLowerCase().includes(pattern.toLowerCase())
            );

            if (isCourseType) {
                // Save the previous course if it exists
                if (currentCourseType && currentFoodItems.length > 0) {
                    courses.push({
                        id: courseId++,
                        courseType: currentCourseType,
                        foodItems: currentFoodItems.join(', ')
                    });
                }

                // Start a new course
                currentCourseType = this.normalizeCourseType(trimmedLine);
                currentFoodItems = [];
            } else if (trimmedLine && currentCourseType) {
                // This is a food item
                const cleanedItem = this.cleanFoodItem(trimmedLine);
                if (cleanedItem) {
                    currentFoodItems.push(cleanedItem);
                }
            } else if (trimmedLine && !currentCourseType) {
                // If we haven't found a course type yet, treat this as a generic food item
                if (!currentCourseType) {
                    currentCourseType = 'Main Items';
                }
                const cleanedItem = this.cleanFoodItem(trimmedLine);
                if (cleanedItem) {
                    currentFoodItems.push(cleanedItem);
                }
            }
        }

        // Add the last course
        if (currentCourseType && currentFoodItems.length > 0) {
            courses.push({
                id: courseId++,
                courseType: currentCourseType,
                foodItems: currentFoodItems.join(', ')
            });
        }

        return courses;
    }

    /**
     * Normalize course type names
     */
    private static normalizeCourseType(courseType: string): string {
        const normalized = courseType.trim();

        // Handle common variations
        if (normalized.toLowerCase().includes('entrée') || normalized.toLowerCase().includes('entree')) {
            return 'Entrée';
        }
        if (normalized.toLowerCase().includes('international') || normalized.toLowerCase().includes('intemational')) {
            return 'International Station';
        }
        if (normalized.toLowerCase().includes('salad')) {
            return 'Salads of the Day';
        }
        if (normalized.toLowerCase().includes('soup')) {
            return 'Soups of the Day';
        }
        if (normalized.toLowerCase().includes('pasta')) {
            return 'Pasta Station';
        }
        if (normalized.toLowerCase().includes('dessert')) {
            return 'Dessert';
        }

        return normalized;
    }

    /**
     * Remove OCR artifacts and unwanted symbols
     */
    private static removeOcrArtifacts(text: string): string {
        return text
            // Remove common OCR artifacts and symbols
            .replace(/\s*\[\\?\/?\/?\]\s*/g, '') // Remove [/], [\], [/], etc.
            .replace(/\s*\[>\]\s*/g, '') // Remove [>]
            .replace(/\s*\[>>\]\s*/g, '') // Remove [>>]
            .replace(/\s*\[<\]\s*/g, '') // Remove [<]
            .replace(/\s*\[<<\]\s*/g, '') // Remove [<<]
            .replace(/\s*\(\>\>\)\s*/g, '') // Remove (>>)
            .replace(/\s*\(\<\<\)\s*/g, '') // Remove (<<)
            .replace(/\s*\[\]\s*/g, '') // Remove empty brackets
            .replace(/\s*\(\)\s*/g, '') // Remove empty parentheses
            .replace(/\s*\{\}\s*/g, '') // Remove empty braces
            .replace(/\s*®\s*/g, '') // Remove registered trademark
            .replace(/\s*©\s*/g, '') // Remove copyright
            .replace(/\s*™\s*/g, '') // Remove trademark
            .replace(/\s*℠\s*/g, '') // Remove service mark
            // Remove dietary indicator symbols (but preserve the info in parentheses)
            .replace(/\s*\[Vv\]\s*/g, '') // Remove [Vv] (vegetarian/vegan indicators)
            .replace(/\s*\(Vv\)\s*/g, '') // Remove (Vv)
            // Remove various bracket/symbol combinations
            .replace(/\s*\[[-\\/|*+>]+\]\s*/g, '') // Remove [--], [//], [||], [>], etc.
            .replace(/\s*\([-\\/|*+>]+\)\s*/g, '') // Remove (--), (//), (||), etc.
            // Remove standalone numbers in parentheses that seem like OCR artifacts
            .replace(/\s*\(\d\)\s*/g, '') // Remove (1), (2), etc.
            // Remove trailing symbols that look like OCR errors
            .replace(/\s*@@\)\s*/g, '') // Remove @@)
            .replace(/\s*@+\s*/g, '') // Remove multiple @ symbols
            // Remove standalone single letters that are likely OCR errors (be careful here)
            .replace(/\s+[A-Z]\s+/g, ' ') // Remove isolated capital letters with spaces around them
            .replace(/\s+[A-Z]$/g, '') // Remove trailing isolated capital letters
            // Remove standalone symbols that are likely OCR errors
            .replace(/\s*[►▼▲◄◊♦▪▫■□●○]\s*/g, '') // Remove various shapes/arrows
            .replace(/\s*[★☆✓✔️❌×⚠️⚡️]\s*/g, '') // Remove stars/checks/warnings
            // Remove emoji ranges (common food/UI emojis)
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove most emojis
            .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove misc symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove dingbats
            // Clean up multiple spaces and trailing commas/periods from removed symbols
            .replace(/\s*,\s*,/g, ',') // Remove double commas
            .replace(/\s{2,}/g, ' ') // Normalize multiple spaces
            .replace(/,\s*$/, '') // Remove trailing commas
            .trim();
    }

    /**
     * Clean and format food item names
     */
    private static cleanFoodItem(item: string): string {
        // First remove notice sections
        const withoutNotice = this.removeNoticeSection(item);

        return this.removeOcrArtifacts(withoutNotice)
            .replace(/^[-•*]\s*/, '') // Remove bullet points
            .replace(/\s*@\s*$/, '') // Remove trailing @ symbols
            .trim();
    }
}
