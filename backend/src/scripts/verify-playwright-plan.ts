
import { buildScriptBody, WalkthroughScript } from '../agent/venv-playwright-runner.js';
import { PlaywrightRunner } from '../playwright-runner.js';

// 1. Simulate the User's "TS Plan" (as a parsed object)
const userExamplePlan: WalkthroughScript = {
    name: "Navigate to About Page",
    entryUrl: "https://example.com", // Use a real public URL for testing
    steps: [
        {
            description: "Navigate to the home page",
            action: "goto",
            target: "https://example.com"
        },
        {
            description: "Click the 'More information' link",
            action: "click",
            target: "a" // Simple CSS selector for the link
        },
        {
            description: "Wait for navigation",
            action: "wait",
            value: "2000"
        }
    ]
};

async function verifyPlanExecution() {
    console.log("---------------------------------------------------");
    console.log("VERIFYING PLAYWRIGHT PLAN EXECUTION");
    console.log("---------------------------------------------------");

    // 2. Generate the Script Body (Code Generation)
    console.log("\n[1] Generating Script Body from Plan...");
    const scriptBody = buildScriptBody(userExamplePlan);
    console.log("---------------------------------------------------");
    console.log(scriptBody);
    console.log("---------------------------------------------------");

    // 3. Execute with PlaywrightRunner
    console.log("\n[2] Executing Script with PlaywrightRunner...");
    const runner = new PlaywrightRunner();

    // Use a temporary video directory
    const result = await runner.run({
        baseUrl: "https://example.com", // Base URL is required but overridden by absolute goto
        route: "",
        scriptBody,
        postScriptWaitMs: 1000,
        videoDir: "./test-videos"
    });

    console.log("\n[3] Execution Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
        console.log("\n✅ SUCCESS: The plan was transpiled and executed correctly.");
        if (result.videoPath) {
            console.log(`🎥 Video saved to: ${result.videoPath}`);
        }
    } else {
        console.error("\n❌ FAILED: ", result.error);
        process.exit(1);
    }
}

verifyPlanExecution().catch(err => {
    console.error("Verification crashed:", err);
    process.exit(1);
});
