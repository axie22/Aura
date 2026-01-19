
import { buildScriptBody, WalkthroughScript } from '../agent/venv-playwright-runner.js';
import { PlaywrightRunner } from '../playwright-runner.js';

const userExamplePlan: WalkthroughScript = {
    name: "Example Domain highlight test",
    entryUrl: "https://example.com",
    scriptBody: `
        await page.goto("https://example.com");
        await page.waitForTimeout(500);
    `,
    highlightSelectors: [
        "h1",
        "text=Example Domain"
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
