import { NextRequest, NextResponse } from 'next/server';
import { GrokMenuParser } from '@/app/services/grokParser';

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const { text } = await request.json();
        
        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Invalid request: text field is required' },
                { status: 400 }
            );
        }

        console.log('📥 Received menu parsing request');
        
        // Parse the menu using Grok API
        const parsedMenu = await GrokMenuParser.parseMenu(text);
        
        console.log('✅ Menu parsing completed successfully');
        console.log('📊 Parsed menu keys:', Object.keys(parsedMenu));
        
        return NextResponse.json({ 
            success: true, 
            data: parsedMenu 
        });
        
    } catch (error) {
        console.error('❌ Menu parsing API error:', error);
        
        // Extract more details for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error instanceof Error && error.stack ? error.stack : errorMessage;
        
        console.error('Full error details:', errorDetails);
        
        return NextResponse.json(
            { 
                error: 'Failed to parse menu', 
                details: errorMessage,
                fullError: errorDetails
            },
            { status: 500 }
        );
    }
}
