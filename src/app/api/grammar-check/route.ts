// src/app/api/grammar-check/route.ts
import { NextResponse } from 'next/server';

// Type definition for the expected request body
interface GrammarCheckRequest {
    text: string;
}

export async function POST(req: Request) {
    try {
        const body: GrammarCheckRequest = await req.json();
        const { text } = body;

        if (!text || text.trim() === '') {
            return NextResponse.json(
                { error: 'Please provide text to check.' },
                { status: 400 }
            );
        }

        if (text.length > 3000) {
            return NextResponse.json(
                { error: 'Text exceeds the 3000 character limit.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Gemini API key is not configured on the server.' },
                { status: 500 }
            );
        }

        // Combine the user prompt with the requested system instruction
        const prompt = `
        Detect grammar mistakes in the text.

        Return ONLY JSON in this format:

        {
        "corrections":[
            {
            "original_sentence":"",
            "corrected_sentence":"",
            "explanation":""
            }
        ]
        }

        Rules:
        - Return the FULL sentence containing the grammar mistake.
        - Provide the corrected version of the entire sentence.
        - Do NOT return only phrases.
        - Do not rewrite sentences that are already correct.
        - Preserve the original tense unless the tense itself is incorrect.
        - If no errors exist return {"corrections":[]}

        Text:
        """${text}"""
        `;

        // Call the Gemini API endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 800,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "object",
                            properties: {
                                corrections: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            original_sentence: { type: "string" },
                                            corrected_sentence: { type: "string" },
                                            explanation: { type: "string" }
                                        },
                                        required: [
                                            "original_sentence",
                                            "corrected_sentence",
                                            "explanation"
                                        ]
                                    }
                                }
                            },
                            required: ["corrections"]
                        }
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
        }

        const data = await response.json();

        // Extract the text content from the Gemini response structure
        const resultText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ??
            data?.candidates?.[0]?.output?.text;

        console.log("Gemini raw output:", resultText);

        if (!resultText) {
            throw new Error('No valid response generated from the model.');
        }

        let parsed;


        try {
            parsed = JSON.parse(resultText);
        } catch (err) {
            console.error("JSON Parse Error:", resultText);
            parsed = { corrections: [] };
        }
        if (!parsed.corrections) {
            parsed.corrections = [];
        }

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error('Grammar Check Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}