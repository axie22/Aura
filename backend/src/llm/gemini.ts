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

export async function generatePRSummary(
    diff: string,
    repoContext: string
): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return "Error: Missing API Key";
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: { responseMimeType: "text/plain" }
        });

        const prompt = `
            You are a helpful assistant for a developer tool.
            
            Goal: Read the provided Pull Request Diff and Repository Context.
            Output: A single, concise sentence summarizing what these changes do from a user/product perspective.
            
            - Keep it under 20 words.
            - Do not mention file names or technical jargon (like "refactor", "component").
            - Focus on the *feature* or *fix*.
            
            Diff:
            ${diff}
            
            Context:
            ${repoContext}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error: any) {
        console.error("Error generating summary:", error);
        return "Updates to the application.";
    }
}
