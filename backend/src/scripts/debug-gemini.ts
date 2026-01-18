import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
    console.log("Checking available models...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("No API Key found!");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        // Accessing the model manager to list models
        // Note: SDK might expose this differently depending on version, 
        // but typically it's not directly on genAI instance in all versions.
        // Let's try a direct fetch if sdk doesn't make it obvious, 
        // OR better, just use the known valid models.
        // Actually, let's try a simple GET request to the API directly to debug.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        // @ts-ignore
        data.models.forEach(m => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
        });

    } catch (error: any) {
        console.error("Error listing models:", error);
    }
}

listModels();
