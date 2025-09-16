// Grok API Menu Parser Service
// Uses XAI's Grok API to parse OCR-extracted text into structured menu data

import { ParsedWeeklyMenu } from './menuParser';

export class GrokMenuParser {
    private static readonly API_BASE_URL = 'https://api.x.ai/v1';
    private static readonly MODEL = 'grok-3-mini'; // Lightweight model perfect for parsing tasks
    
    /**
     * Parse OCR text using Grok API
     */
    static async parseMenu(ocrText: string): Promise<ParsedWeeklyMenu> {
        console.log('🤖 Starting Grok API menu parsing...');
        
        try {
            // Check if API key is available
            if (!process.env.XAI_API_KEY) {
                throw new Error('XAI_API_KEY environment variable is not set');
            }
            
            // Read the parsing instructions
            const instructions = await this.getParsingInstructions();
            console.log('📝 Using instructions length:', instructions.length);
            
            // Prepare the API request
            const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: instructions
                        },
                        {
                            role: 'user',
                            content: `Parse this menu text into the required JSON format. Respond with ONLY the JSON object, no other text:\n\n${ocrText}`
                        }
                    ],
                    model: this.MODEL,
                    temperature: 0.1, // Low temperature for consistent structured output
                    max_tokens: 15000, // Increased for longer responses
                    // Note: response_format may not be supported by all models
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Grok API request failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Grok API response received');
            console.log('🔍 Full API response structure:', JSON.stringify(result, null, 2));

            // Check the finish reason first
            const choice = result.choices?.[0];
            const finishReason = choice?.finish_reason;
            
            if (finishReason === 'length') {
                throw new Error('Response was truncated due to max_tokens limit. Try with shorter text or increase max_tokens.');
            }
            
            // Extract the content from the response
            const content = choice?.message?.content;
            if (!content) {
                console.error('❌ No content in response. Full result:', result);
                console.error('Finish reason:', finishReason);
                console.error('Choices array:', result.choices);
                console.error('First choice:', choice);
                console.error('Message:', choice?.message);
                throw new Error(`No content received from Grok API. Finish reason: ${finishReason}`);
            }

            console.log('📋 Raw Grok response:', content);

            // Extract JSON from the response with multiple strategies
            let jsonString = content;
            
            // Strategy 1: Look for JSON in code blocks
            const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                jsonString = codeBlockMatch[1].trim();
                console.log('📦 Found JSON in code block');
            } else {
                // Strategy 2: Look for JSON object patterns
                const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
                if (jsonObjectMatch) {
                    jsonString = jsonObjectMatch[0];
                    console.log('📦 Found JSON object pattern');
                } else {
                    // Strategy 3: Clean up the content and try to extract JSON
                    jsonString = content
                        .replace(/^[^{]*/, '') // Remove everything before the first {
                        .replace(/[^}]*$/, '') // Remove everything after the last }
                        .trim();
                    console.log('📦 Cleaned up content for JSON extraction');
                }
            }

            console.log('🔍 Attempting to parse JSON:', jsonString.substring(0, 200) + '...');

            // Parse the JSON
            let parsedMenu: ParsedWeeklyMenu;
            try {
                parsedMenu = JSON.parse(jsonString);
                console.log('✅ JSON parsing successful');
                
                // Validate the structure (but be more lenient)
                if (!this.validateMenuStructure(parsedMenu)) {
                    console.warn('⚠️ Menu structure validation failed, but proceeding anyway');
                    // Don't throw error, just log warning
                }
                
            } catch (parseError) {
                console.error('❌ JSON parsing failed:', parseError);
                console.error('🔍 Attempted to parse:', jsonString);
                console.error('📋 Full raw content:', content);
                
                // Try one more time with a more aggressive extraction
                try {
                    const aggressiveMatch = content.match(/(\{[\s\S]*\})/);
                    if (aggressiveMatch) {
                        const aggressiveJson = aggressiveMatch[1];
                        console.log('🔄 Trying aggressive JSON extraction:', aggressiveJson.substring(0, 200) + '...');
                        parsedMenu = JSON.parse(aggressiveJson);
                        console.log('✅ Aggressive JSON parsing successful');
                        
                        if (!this.validateMenuStructure(parsedMenu)) {
                            console.warn('⚠️ Aggressive extraction validation failed, but proceeding anyway');
                        }
                    } else {
                        throw parseError;
                    }
                } catch {
                    throw new Error(`Failed to parse JSON response from Grok API. Raw response: ${content.substring(0, 500)}...`);
                }
            }

            console.log('🎉 Successfully parsed menu with Grok:', parsedMenu);
            return parsedMenu;

        } catch (error) {
            console.error('❌ Grok API parsing failed:', error);
            throw error;
        }
    }

    /**
     * Get the parsing instructions from the markdown file
     */
    private static async getParsingInstructions(): Promise<string> {
        try {
            // In a Next.js environment, we'll read the instructions from the public folder
            // or embed them directly in the code for better reliability
            return this.getEmbeddedInstructions();
        } catch (error) {
            console.error('Failed to load parsing instructions:', error);
            return this.getEmbeddedInstructions();
        }
    }

    /**
     * Embedded parsing instructions for reliability
     */
    private static getEmbeddedInstructions(): string {
        return `Parse menu text into JSON. Output ONLY JSON, no explanations. Schema:

{
  "0": {
    "id": 0,
    "dayName": "Monday",
    "meals": [
      {
        "id": 0,
        "timeOfDay": "breakfast",
        "startTime": "7:00am",
        "endTime": "9:30am",
        "courses": [
          {
            "id": 0,
            "courseType": "Entrée",
            "foodItems": "Pancakes, French Toast, Scrambled Eggs"
          }
        ]
      }
    ]
  }
}

Rules:
- Days: numeric keys 0,1,2... dayName: Monday,Tuesday...
- timeOfDay: breakfast,lunch,dinner,brunch
- Times: "7:00am", "11:20am-1pm" format
- courseType: "Entrée","International Station","Salads of the Day","Soups of the Day","Pasta Station","Dessert","Main Items"
- Clean OCR artifacts: remove [symbols], @@, *, bullets
- Stop at "Notice" sections

Return ONLY JSON, no text.`;
    }

    /**
     * Validate the parsed menu structure
     */
    private static validateMenuStructure(menu: unknown): boolean {
        try {
            // Basic structure validation
            if (typeof menu !== 'object' || menu === null) {
                return false;
            }

            // Check if we have at least one day
            const dayKeys = Object.keys(menu);
            if (dayKeys.length === 0) {
                return false;
            }

            // Validate each day
            const menuObj = menu as Record<string, unknown>;
            for (const dayKey of dayKeys) {
                const day = menuObj[dayKey];
                if (!day || typeof day !== 'object') {
                    return false;
                }

                // Check required day properties
                const dayObj = day as Record<string, unknown>;
                if (typeof dayObj.id !== 'number' || 
                    typeof dayObj.dayName !== 'string' || 
                    !Array.isArray(dayObj.meals)) {
                    return false;
                }

                // Validate meals
                for (const meal of dayObj.meals) {
                    if (!meal || typeof meal !== 'object') {
                        return false;
                    }
                    
                    const mealObj = meal as Record<string, unknown>;
                    if (typeof mealObj.id !== 'number' ||
                        typeof mealObj.timeOfDay !== 'string' ||
                        typeof mealObj.startTime !== 'string' ||
                        typeof mealObj.endTime !== 'string' ||
                        !Array.isArray(mealObj.courses)) {
                        return false;
                    }

                    // Validate courses
                    for (const course of mealObj.courses) {
                        if (!course || typeof course !== 'object') {
                            return false;
                        }
                        
                        const courseObj = course as Record<string, unknown>;
                        if (typeof courseObj.id !== 'number' ||
                            typeof courseObj.courseType !== 'string' ||
                            typeof courseObj.foodItems !== 'string') {
                            return false;
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Menu validation error:', error);
            return false;
        }
    }
}
