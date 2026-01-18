import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper: getRepoContext removed. Now handled by analyzer.ts via GitHub API.

export async function generatePlaywrightPlan(
    diff: string,
    repoContext: string,
    customPrompt: string
): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return JSON.stringify({ error: "Missing GEMINI_API_KEY" });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Construct the full prompt using the provided inputs
        const fullPrompt = `
            ${customPrompt}

            Here is the Repository Structure and Content:
            ${repoContext}

            Here is the Pull Request Diff:
            ${diff}
            `;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        return JSON.stringify({ error: error.message });
    }
}
