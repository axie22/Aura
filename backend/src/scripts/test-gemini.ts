// import { summarizeDiff } from '../llm/gemini.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
    console.log("Testing Gemini Diff Summarizer... [SKIPPED - summarizeDiff removed]");
    /*
    const mockDiff = `...`;
    console.log("Sending mock diff to Gemini...");
    const summary = await summarizeDiff(mockDiff);
    console.log("\n--- GEMINI SUMMARY ---\n");
    console.log(summary);
    */
}

testGemini();
