import { buildScriptBody, WalkthroughScript } from '../agent/venv-playwright-runner.js';

function testBuilder() {
    const script: WalkthroughScript = {
        name: 'Test Script',
        entryUrl: '/',
        highlightSelectors: [
            '.css-selector',
            "getByRole('button', { name: 'Submit' })",
            "page.getByText('Hello')"
        ],
        steps: [
            { description: 'Click CSS', action: 'click', target: '#id' },
            { description: 'Click Role', action: 'click', target: "getByRole('link')" },
            { description: 'Fill Input', action: 'fill', target: "getByPlaceholder('Name')", value: 'John' },
            { description: 'Assert Text', action: 'assertText', target: '.status', value: 'Active' }
        ]
    };

    console.log('Generating script body...');
    const body = buildScriptBody(script);
    
    console.log('\n--- Generated Body ---\n');
    console.log(body);
    console.log('\n----------------------\n');

    // Basic assertions
    if (!body.includes("page.locator(\".css-selector\")")) console.error("FAIL: Missing CSS selector highlight");
    if (!body.includes("page.getByRole('button', { name: 'Submit' })")) console.error("FAIL: Missing getByRole highlight");
    if (!body.includes("page.getByText('Hello')")) console.error("FAIL: Missing page.getByText highlight");
    
    if (!body.includes("await page.locator(\"#id\").click()")) console.error("FAIL: Missing CSS click");
    if (!body.includes("await page.getByRole('link').click()")) console.error("FAIL: Missing getByRole click");
    if (!body.includes("await page.getByPlaceholder('Name').fill(\"John\")")) console.error("FAIL: Missing fill");
    
    console.log('Verification complete.');
}

testBuilder();
