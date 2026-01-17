import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// TODO: add error handling, need to make sure diff string size is not too large
export async function summarizeDiff(diff: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return "Error: GEMINI_API_KEY not found in environment variables.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
You are an expert Senior UI Engineer and Tech Lead.
Your task is to review the following code changes (diff) from a Pull Request.

Please provide a concise but comprehensive summary of:
1. What UI components were modified?
2. Are there any potential visual regressions or styling issues?
3. Did the developer follow best practices (e.g. using variables instead of hardcoded values)?

Here is the diff:
\`\`\`
${diff}
\`\`\`

Format your response in Markdown.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        return `Error generating summary: ${error.message}`;
    }
}
