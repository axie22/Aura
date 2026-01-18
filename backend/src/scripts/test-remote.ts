import dotenv from 'dotenv';
import path from 'path';
import { analyzeDiff } from '../diff/analyzer.js';

// Load env from backend/.env
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

async function run() {
    console.log("🚀 Testing Remote Context Fetching via Analyzer...");

    if (!process.env.APP_ID || !process.env.PRIVATE_KEY_PATH || !process.env.GEMINI_API_KEY) {
        console.error("❌ Missing environment variables. Please check backend/.env");
        process.exit(1);
    }

    // Usage: npx tsx backend/src/scripts/test-remote.ts <owner> <repo> <pullNumber> <installationId>
    const owner = process.argv[2] || "axie22";
    const repo = process.argv[3] || "Aura";
    const pullNumber = parseInt(process.argv[4] || "1");
    // You can find your Installation ID in the URL of your installed GitHub App settings,
    // or from the webhook payload headers if you have logs.
    const mockInstallationId = parseInt(process.argv[5] || "59868770");

    console.log(`\nUsage: npx tsx backend/src/scripts/test-remote.ts <owner> <repo> <pullNumber> <installationId>`);
    console.log(`Using: ${owner}/${repo} PR #${pullNumber} (App ID: ${mockInstallationId})`);

    await analyzeDiff(mockInstallationId, owner, repo, pullNumber);
}

run();
