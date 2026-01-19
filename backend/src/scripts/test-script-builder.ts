import { buildScriptBody, WalkthroughScript } from '../agent/venv-playwright-runner.js';

function testBuilder() {
    const script: WalkthroughScript = {
        name: 'Test Script',
        entryUrl: '/',
        scriptBody: `
            await page.getByRole('button', { name: 'Login' }).click();
            await page.fill('#email', 'user@example.com');
        `,
        highlightSelectors: [
            '.main-button',
            '#header-logo'
        ]
    };

    console.log('Generating script body...');
    const body = buildScriptBody(script);
    
    console.log('\n--- Generated Body ---\n');
    console.log(body);
    console.log('\n----------------------\n');

    // Verification Logic
    const failures: string[] = [];

    // 1. Check for Highlights (converted to browser logic)
    if (!body.includes('document.querySelectorAll')) failures.push("Missing highlight logic (document.querySelectorAll)");
    if (!body.includes('.main-button')) failures.push("Missing highlight selector .main-button");
    if (!body.includes('#header-logo')) failures.push("Missing highlight selector #header-logo");

    // 2. Check for Script Body Injection
    if (!body.includes("// --- Generated Script Body ---")) failures.push("Missing script body marker");
    if (!body.includes("await page.getByRole('button', { name: 'Login' }).click();")) failures.push("Missing raw script content: getByRole");
    if (!body.includes("await page.fill('#email', 'user@example.com');")) failures.push("Missing raw script content: page.fill");

    // 3. Check for Base Waits
    if (!body.includes("await page.waitForLoadState('domcontentloaded');")) failures.push("Missing base wait: domcontentloaded");
    
    if (failures.length > 0) {
        console.error("❌ verification FAILED:");
        failures.forEach(f => console.error(`  - ${f}`));
        process.exit(1);
    } else {
        console.log("✅ Verification SUCCESS: Script builder correctly injects highlights and raw script.");
    }
}

testBuilder();
